import { promises as fs } from "node:fs";
import path from "node:path";
import type { Page, PagesFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PAGES_PATH = path.join(DATA_DIR, "pages.json");

async function readPagesFile(): Promise<PagesFile> {
  const raw = await fs.readFile(PAGES_PATH, "utf8");
  return JSON.parse(raw) as PagesFile;
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
