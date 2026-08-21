import type { GateResult, Step } from "./types";
import { runGate } from "./kane";
import { getPage, updatePage, setCtaWired } from "./store";
import { buildReceipt, saveReceipt } from "./receipt";
import { notifyPublish } from "./webhook";

export function diagnoseFailure(steps: Step[]): string {
  const failed = steps.find((s) => s.status === "fail");
  if (failed) return `Step ${failed.step} failed: ${failed.action}`;
  return "Success message never appeared after clicking the CTA";
}

/**
 * The real fix. The button was dead because its submit handler was never wired
 * (cta.wired === false). Wiring it is a genuine change to what the served page
 * renders — the same click now reaches the success state. No mock: the next
 * Kane run drives a real browser against the newly-wired page.
 */
export async function agentFix(
  pageId: string,
  ctaId: string,
  diagnosis: string,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`  fix · ${diagnosis} → wiring "${pageId}.${ctaId}"`);
  await setCtaWired(pageId, ctaId, true);
}

export type LoopOutcome = {
  attempts: GateResult[][]; // one array per gate cycle, one entry per CTA
  published: boolean;
  receiptId: string | null;
};

/**
 * build → gate every CTA → (if any red) wire the red CTA(s) → re-gate → publish
 * only when every CTA is TRUE. Publish state and the receipt are only written
 * on a full-green cycle.
 */
export async function healAndPublish(
  pageId: string,
  previewBase: string,
  maxAttempts = 3,
): Promise<LoopOutcome> {
  const attempts: GateResult[][] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const page = await getPage(pageId);
    if (!page) throw new Error(`unknown page: ${pageId}`);
    const previewUrl = `${previewBase.replace(/\/$/, "")}/examples/${pageId}`;
    // eslint-disable-next-line no-console
    console.log(`\n▶ Gate attempt ${attempt} · ${previewUrl}`);

    const cycle: GateResult[] = [];
    for (const cta of page.ctas) {
      // eslint-disable-next-line no-console
      console.log(`  · CTA "${cta.label}" (${cta.id})`);
      const result = await runGate(page, cta, previewUrl);
      cycle.push(result);
      // eslint-disable-next-line no-console
      console.log(
        `    verdict: ${result.verdict}` +
          (result.sessionId ? ` · session ${result.sessionId}` : ""),
      );
    }
    attempts.push(cycle);

    if (cycle.every((r) => r.verdict === "TRUE")) {
      const receipt = buildReceipt(cycle);
      const receiptId = await saveReceipt(receipt);
      const history = [...(page.receipts ?? []), receiptId];
      await updatePage(pageId, { published: true, receiptId, receipts: history });
      // eslint-disable-next-line no-console
      console.log(`  ✓ publish ALLOWED · receipt ${receiptId}`);

      const base = previewBase.replace(/\/$/, "");
      const hook = await notifyPublish({
        event: "latch.published",
        pageId,
        receiptId,
        receiptUrl: `${base}/api/receipt/${receiptId}`,
        liveUrl: `${base}/p/${pageId}`,
        verifiedAt: receipt.verifiedAt,
        ctas: cycle.map((r) => r.cta),
      });
      if (hook.sent) {
        // eslint-disable-next-line no-console
        console.log(`  → webhook fired (status ${hook.status})`);
      }
      return { attempts, published: true, receiptId };
    }

    // Some CTA is red → publish stays blocked; wire the red ones and retry.
    // eslint-disable-next-line no-console
    console.log("  ✗ publish BLOCKED");
    if (attempt < maxAttempts) {
      const reds = cycle.filter((r) => r.verdict !== "TRUE");
      for (const red of reds) {
        const diagnosis = red.summary?.split("\n")[0] || diagnoseFailure(red.steps);
        await agentFix(pageId, red.ctaId, diagnosis);
      }
    }
  }

  return { attempts, published: false, receiptId: null };
}
