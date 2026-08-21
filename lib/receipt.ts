import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import type { GateResult, Receipt, ReceiptCta } from "./types";

const RECEIPT_DIR = process.env.RECEIPT_DIR
  ? path.resolve(process.env.RECEIPT_DIR)
  : path.join(process.cwd(), "data", "receipts");

function secret(): string {
  return process.env.RECEIPT_SECRET ?? "latch-dev-secret";
}

/** Deterministic signature over everything but the signature field itself. */
export function signReceipt(payload: Omit<Receipt, "signature">): string {
  const canonical = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret()).update(canonical).digest("hex");
}

export function verifyReceipt(receipt: Receipt): boolean {
  const { signature, ...payload } = receipt;
  const expected = signReceipt(payload);
  // constant-time compare
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function stepsFor(result: GateResult): Step[] {
  // Kane emits an internal "analyze:" reasoning step that duplicates the
  // "assert:" verification; keep the concrete browser actions for the receipt.
  return result.steps
    .filter((s) => !s.action.startsWith("analyze:"))
    .map((s, i) => ({ ...s, step: i + 1 }));
}

type Step = GateResult["steps"][number];

/** Build a page-level receipt from one or many per-CTA gate results. */
export function buildReceipt(input: GateResult | GateResult[]): Receipt {
  const results = Array.isArray(input) ? input : [input];
  if (results.length === 0) {
    throw new Error("refusing to issue an empty receipt");
  }
  if (results.some((r) => r.verdict !== "TRUE")) {
    throw new Error("refusing to issue a receipt: not every CTA verdict is TRUE");
  }
  const pageId = results[0].pageId;
  if (results.some((r) => r.pageId !== pageId)) {
    throw new Error("refusing to issue a receipt spanning multiple pages");
  }

  const ctas: ReceiptCta[] = results.map((r) => ({
    id: r.ctaId,
    cta: r.cta,
    verdict: r.verdict,
    checks: stepsFor(r),
    kaneSessionId: r.sessionId,
    videoTrace: r.videoTrace,
  }));

  const first = ctas[0];
  const payload: Omit<Receipt, "signature"> = {
    pageId,
    verdict: "TRUE",
    ctas,
    verifiedAt: new Date().toISOString(),
    // Legacy single-CTA mirror — keeps older viewers rendering meaningfully:
    cta: first.cta,
    checks: first.checks,
    kaneSessionId: first.kaneSessionId,
    videoTrace: first.videoTrace,
  };
  return { ...payload, signature: signReceipt(payload) };
}

export async function saveReceipt(receipt: Receipt): Promise<string> {
  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  const id = `${receipt.pageId}-${crypto.randomUUID().slice(0, 8)}`;
  await fs.writeFile(
    path.join(RECEIPT_DIR, `${id}.json`),
    JSON.stringify(receipt, null, 2) + "\n",
    "utf8",
  );
  return id;
}

export async function loadReceipt(id: string): Promise<Receipt | null> {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  try {
    const raw = await fs.readFile(path.join(RECEIPT_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as Receipt;
  } catch {
    return null;
  }
}

/** Normalise legacy single-CTA receipts (missing `ctas[]`) into the new shape
 *  so the receipt viewer can iterate uniformly. Does NOT re-sign. */
export function normaliseReceipt(receipt: Receipt): Receipt {
  if (Array.isArray(receipt.ctas) && receipt.ctas.length > 0) return receipt;
  const legacy: ReceiptCta = {
    id: "primary",
    cta: receipt.cta ?? "primary",
    verdict: receipt.verdict,
    checks: receipt.checks ?? [],
    kaneSessionId: receipt.kaneSessionId ?? null,
    videoTrace: receipt.videoTrace ?? null,
  };
  return { ...receipt, ctas: [legacy] };
}
