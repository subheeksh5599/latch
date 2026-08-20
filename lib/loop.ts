import type { GateResult, Step } from "./types";
import { runGate } from "./kane";
import { getPage, updatePage } from "./store";
import { buildReceipt, saveReceipt } from "./receipt";

export function diagnoseFailure(steps: Step[]): string {
  const failed = steps.find((s) => s.status === "fail");
  if (failed) return `Step ${failed.step} failed: ${failed.action}`;
  return "Success message never appeared after clicking the CTA";
}

/**
 * The real fix. The button was dead because its submit handler was never wired
 * (page.wired === false). Wiring it is a genuine change to what the served page
 * renders — the same click now reaches the success state. No mock: the next
 * Kane run drives a real browser against the newly-wired page.
 */
export async function agentFix(pageId: string, diagnosis: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`  fix · ${diagnosis} → wiring the "${pageId}" CTA handler`);
  await updatePage(pageId, { wired: true });
}

export type LoopOutcome = {
  attempts: GateResult[];
  published: boolean;
  receiptId: string | null;
};

/**
 * build → gate → (if red) fix → re-gate → publish-on-green.
 * Publish state and the receipt are only written on a genuine TRUE verdict.
 */
export async function healAndPublish(
  pageId: string,
  previewBase: string,
  maxAttempts = 2,
): Promise<LoopOutcome> {
  const attempts: GateResult[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const page = await getPage(pageId);
    if (!page) throw new Error(`unknown page: ${pageId}`);
    const previewUrl = `${previewBase.replace(/\/$/, "")}/examples/${pageId}`;

    // eslint-disable-next-line no-console
    console.log(`\n▶ Gate attempt ${attempt} · ${previewUrl}`);
    const result = await runGate(page, previewUrl);
    attempts.push(result);
    // eslint-disable-next-line no-console
    console.log(
      `  verdict: ${result.verdict}` +
        (result.sessionId ? ` · session ${result.sessionId}` : ""),
    );

    if (result.verdict === "TRUE") {
      const receipt = buildReceipt(result);
      const receiptId = await saveReceipt(receipt);
      const history = [...(page.receipts ?? []), receiptId];
      await updatePage(pageId, { published: true, receiptId, receipts: history });
      // eslint-disable-next-line no-console
      console.log(`  ✓ publish ALLOWED · receipt ${receiptId}`);
      return { attempts, published: true, receiptId };
    }

    // FALSE → publish stays blocked.
    // eslint-disable-next-line no-console
    console.log("  ✗ publish BLOCKED");
    if (attempt < maxAttempts) {
      const diagnosis = result.summary?.split("\n")[0] || diagnoseFailure(result.steps);
      await agentFix(pageId, diagnosis);
    }
  }

  return { attempts, published: false, receiptId: null };
}
