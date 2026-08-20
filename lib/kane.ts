import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GateResult, Page, Step, Verdict } from "./types";

/**
 * What the Kane NDJSON stream actually looks like (learned from real runs):
 *
 *   {"type":"recording_state","session_id":"...","enabled":true}
 *   {"step":2,"status":"running","remark":"Step 1"}
 *   {"step":2,"status":"done","remark":"navigate: Navigate to ..."}
 *   {"step":4,"status":"done","remark":"assert: the success message appears"}
 *   {"type":"run_end","status":"passed","result_code":100,
 *     "reason_code":"success.complete","per_flow_metadata":[{"result_code":"100"}],
 *     "session_dir":"...","test_url":"https://.../share/..."}
 *
 * Step lines carry status "running"/"done" — NOT pass/fail. The authoritative
 * verdict lives in the run_end event, so we re-derive it from several of its
 * raw fields at once rather than trusting a single boolean.
 */

export type KaneRunEnd = {
  type: "run_end";
  status?: string;
  result_code?: number;
  reason_code?: string;
  test_url?: string;
  session_dir?: string;
  summary?: string;
  per_flow_metadata?: Array<{ result_code?: string | number; error_message?: string | null }>;
};

type StepLine = { step: number; status: string; remark?: string };

export function buildObjective(page: Page): string {
  return (
    `Open the page. Type "tester@publock.dev" into the email input. ` +
    `Click the "${page.cta}" button. ` +
    `Confirm a success message containing "${page.successText}" appears on the page.`
  );
}

function isStepLine(o: unknown): o is StepLine {
  return (
    typeof o === "object" &&
    o !== null &&
    typeof (o as StepLine).step === "number" &&
    typeof (o as StepLine).status === "string"
  );
}

function isRunEnd(o: unknown): o is KaneRunEnd {
  return typeof o === "object" && o !== null && (o as KaneRunEnd).type === "run_end";
}

/** Parse the raw NDJSON stdout into the pieces the gate cares about. */
export function parseNdjson(stdout: string): {
  steps: Step[];
  runEnd: KaneRunEnd | null;
  sessionId: string | null;
} {
  const byStep = new Map<number, StepLine>();
  let runEnd: KaneRunEnd | null = null;
  let sessionId: string | null = null;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue; // ignore non-JSON noise
    }

    if (isRunEnd(obj)) {
      runEnd = obj;
      continue;
    }
    const typed = obj as { type?: string; session_id?: string };
    if (typed.session_id && !sessionId) sessionId = typed.session_id;

    if (isStepLine(obj)) {
      // keep the latest line for each step number (running -> done/failed)
      byStep.set(obj.step, obj);
    }
  }

  const steps: Step[] = [...byStep.values()]
    .sort((a, b) => a.step - b.step)
    .map((s, i) => ({
      step: i + 1,
      action: cleanRemark(s.remark) ?? `Step ${i + 1}`,
      status: s.status === "done" || s.status === "passed" ? "pass" : "fail",
    }));

  if (!sessionId && runEnd?.session_dir) {
    sessionId = path.basename(runEnd.session_dir);
  }

  return { steps, runEnd, sessionId };
}

function cleanRemark(remark?: string): string | undefined {
  if (!remark) return undefined;
  // drop bare "Step N" placeholders in favour of the descriptive line
  if (/^Step \d+$/.test(remark.trim())) return undefined;
  return remark.trim();
}

/**
 * The verdict is TRUE only when every authoritative run_end field agrees:
 * status "passed", result_code 100, a success.* reason, and every flow at 100.
 * A single broken field flips the page to FALSE.
 */
export function deriveVerdict(runEnd: KaneRunEnd | null, steps: Step[]): Verdict {
  if (!runEnd) return "FALSE";
  const statusOk = runEnd.status === "passed";
  const codeOk = runEnd.result_code === 100;
  const reasonOk =
    typeof runEnd.reason_code === "string" && runEnd.reason_code.startsWith("success");
  const flows = runEnd.per_flow_metadata ?? [];
  const flowsOk =
    flows.length > 0 && flows.every((f) => String(f.result_code) === "100");
  const stepsOk = steps.length > 0 && steps.every((s) => s.status === "pass");
  return statusOk && codeOk && reasonOk && flowsOk && stepsOk ? "TRUE" : "FALSE";
}

async function saveRaw(pageId: string, stdout: string): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "data", "runs");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${pageId}-${Date.now()}.ndjson`);
    await fs.writeFile(file, stdout, "utf8");
    return file;
  } catch {
    return null;
  }
}

/** Run Kane against the page's preview URL and re-derive a verdict from NDJSON. */
export async function runGate(page: Page, previewUrl: string): Promise<GateResult> {
  const bin = process.env.KANE_CLI_PATH || "kane-cli";
  const timeoutMs = Number(process.env.KANE_TIMEOUT || 60000);
  const headless = (process.env.KANE_HEADLESS ?? "true") !== "false";

  const objective = buildObjective(page);
  const args = ["run", objective, "--agent", "--url", previewUrl];
  if (headless) args.push("--headless");
  args.push("--final-validation", "on");
  args.push("--timeout", String(Math.floor(timeoutMs / 1000)));

  const stdout = await execKane(bin, args, timeoutMs);
  const rawPath = await saveRaw(page.id, stdout);
  const { steps, runEnd, sessionId } = parseNdjson(stdout);
  const verdict = deriveVerdict(runEnd, steps);

  return {
    pageId: page.id,
    cta: page.cta,
    verdict,
    steps,
    sessionId,
    videoTrace: runEnd?.test_url ?? null,
    rawPath,
    summary: runEnd?.summary ?? null,
  };
}

function execKane(bin: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: process.env });
    let stdout = "";
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Kane run timed out after ${timeoutMs}ms`));
    }, timeoutMs + 5000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(killer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(killer);
      // Kane exits 0 even on a failed objective; the verdict comes from NDJSON.
      // Only reject when we got no parseable stream at all.
      if (!stdout.trim()) {
        reject(new Error(`Kane produced no output (exit ${code}). stderr: ${stderr.slice(-500)}`));
        return;
      }
      resolve(stdout);
    });
  });
}
