/**
 * Reset a page back to its broken, unpublished state so the red→green demo is
 * repeatable. Does NOT delete receipts already issued.
 *
 *   node --import tsx scripts/reset.ts --page waitlist
 */
import { updatePage, getPage } from "../lib/store";

async function main() {
  const i = process.argv.indexOf("--page");
  const pageId = i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "waitlist";
  const page = await getPage(pageId);
  if (!page) {
    console.error(`Unknown page "${pageId}".`);
    process.exit(2);
  }
  await updatePage(pageId, { wired: false, published: false, receiptId: null });
  console.log(`Reset "${pageId}" → wired:false, published:false (dead button).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
