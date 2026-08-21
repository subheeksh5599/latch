/**
 * The publish gate, run from the command line (Kane needs a real local Chrome).
 *
 *   npm run latch -- --page waitlist
 *
 * Runs the real-browser gate against the page's preview URL, blocks publish on
 * a red verdict, wires the CTA, re-runs, and publishes with a signed receipt
 * once the button is genuinely proven working.
 */
import { healAndPublish } from "../lib/loop";
import { getPage } from "../lib/store";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const pageId = arg("page", "waitlist")!;
  const previewBase = arg("base", process.env.PREVIEW_BASE_URL || "http://localhost:3000")!;

  const page = await getPage(pageId);
  if (!page) {
    console.error(`Unknown page "${pageId}". Check data/pages.json.`);
    process.exit(2);
  }

  const ctaLabels = page.ctas.map((c) => `"${c.label}"`).join(" · ");
  console.log(`Latch gate · page "${pageId}" · ${page.ctas.length === 1 ? "CTA" : "CTAs"} ${ctaLabels}`);
  console.log(`Preview base: ${previewBase}`);

  const outcome = await healAndPublish(pageId, previewBase);

  console.log("\n─── result ───");
  console.log(`attempts:  ${outcome.attempts.length}`);
  console.log(`published: ${outcome.published}`);
  console.log(`receipt:   ${outcome.receiptId ?? "(none)"}`);

  if (!outcome.published) {
    console.error("\nPublish blocked: the CTA was not proven working.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
