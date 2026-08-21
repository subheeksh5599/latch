import { promises as fs } from "node:fs";
import path from "node:path";
import type { Cta, Page, PagesFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PAGES_PATH = path.join(DATA_DIR, "pages.json");

/** Migrate a legacy single-CTA page record into the new `ctas: Cta[]` shape.
 *  Never re-writes on read — the on-disk file is the source of truth. */
function normalisePage(raw: unknown): Page {
  const p = raw as Partial<Page> & {
    cta?: string;
    successText?: string;
    wired?: boolean;
  };
  if (Array.isArray(p.ctas) && p.ctas.length > 0) return p as Page;
  const legacy: Cta = {
    id: "primary",
    label: p.cta ?? "Continue",
    successText: p.successText ?? "Success",
    wired: p.wired ?? false,
  };
  return {
    id: p.id!,
    title: p.title ?? p.id!,
    ctas: [legacy],
    published: p.published ?? false,
    receiptId: p.receiptId ?? null,
    receipts: p.receipts ?? [],
  };
}

async function readPagesFile(): Promise<PagesFile> {
  const raw = await fs.readFile(PAGES_PATH, "utf8");
  const parsed = JSON.parse(raw) as { pages: unknown[] };
  return { pages: parsed.pages.map(normalisePage) };
}

async function writePagesFile(file: PagesFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PAGES_PATH, JSON.stringify(file, null, 2) + "\n", "utf8");
}

export async function getPage(id: string): Promise<Page | undefined> {
  const { pages } = await readPagesFile();
  return pages.find((p) => p.id === id);
}

export async function listPages(): Promise<Page[]> {
  return (await readPagesFile()).pages;
}

export async function updatePage(
  id: string,
  patch: Partial<Omit<Page, "id">>,
): Promise<Page> {
  const file = await readPagesFile();
  const idx = file.pages.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`unknown page: ${id}`);
  file.pages[idx] = { ...file.pages[idx], ...patch };
  await writePagesFile(file);
  return file.pages[idx];
}

/** Flip a single CTA's `wired` flag — the fix loop's only real mutation. */
export async function setCtaWired(
  pageId: string,
  ctaId: string,
  wired: boolean,
): Promise<Page> {
  const file = await readPagesFile();
  const idx = file.pages.findIndex((p) => p.id === pageId);
  if (idx === -1) throw new Error(`unknown page: ${pageId}`);
  const cIdx = file.pages[idx].ctas.findIndex((c) => c.id === ctaId);
  if (cIdx === -1) throw new Error(`unknown cta: ${pageId}.${ctaId}`);
  file.pages[idx].ctas[cIdx] = { ...file.pages[idx].ctas[cIdx], wired };
  await writePagesFile(file);
  return file.pages[idx];
}
