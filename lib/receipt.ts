import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import type { GateResult, Receipt } from "./types";

const RECEIPT_DIR = process.env.RECEIPT_DIR
  ? path.resolve(process.env.RECEIPT_DIR)
  : path.join(process.cwd(), "data", "receipts");

function secret(): string {
  return process.env.RECEIPT_SECRET ?? "latch-dev-secret";
}

/** Deterministic signature over the receipt payload (everything but the sig). */
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

export function buildReceipt(result: GateResult): Receipt {
  if (result.verdict !== "TRUE") {
    throw new Error("refusing to issue a receipt for a non-green verdict");
  }
  // Kane emits an internal "analyze:" reasoning step that duplicates the
  // "assert:" verification; keep the concrete browser actions for the receipt.
  const checks = result.steps
    .filter((s) => !s.action.startsWith("analyze:"))
    .map((s, i) => ({ ...s, step: i + 1 }));
  const payload: Omit<Receipt, "signature"> = {
    pageId: result.pageId,
    cta: result.cta,
    verdict: result.verdict,
    checks,
    kaneSessionId: result.sessionId,
    videoTrace: result.videoTrace,
    verifiedAt: new Date().toISOString(),
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
