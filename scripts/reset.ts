/**
 * Reset a page back to its broken, unpublished state so the red→green demo is
 * repeatable. Sets every CTA to wired:false. Does NOT delete receipts already
 * issued.
 *
 *   node --import tsx scripts/reset.ts --page waitlist
 */
import { getPage, updatePage } from "../lib/store";

async function main() {
  const i = process.argv.indexOf("--page");
  const pageId = i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "waitlist";
  const page = await getPage(pageId);
  if (!page) {
    console.error(`Unknown page "${pageId}".`);
    process.exit(2);
  }
  const ctas = page.ctas.map((c) => ({ ...c, wired: false }));
  await updatePage(pageId, { ctas, published: false, receiptId: null });
  console.log(
    `Reset "${pageId}" → every CTA wired:false, published:false (dead buttons).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
