import { NextResponse } from "next/server";
import { healAndPublish } from "@/lib/loop";
import { getPage } from "@/lib/store";

// The gate drives a real local Chrome via Kane, so it only runs where a browser
// is available (local dev / a self-hosted runner) — never on serverless.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let pageId = "waitlist";
  try {
    const body = await req.json();
    if (body?.pageId) pageId = String(body.pageId);
  } catch {
    // default page
  }

  const page = await getPage(pageId);
  if (!page) {
    return NextResponse.json({ error: `unknown page: ${pageId}` }, { status: 404 });
  }

  const base = process.env.PREVIEW_BASE_URL || "http://localhost:3000";
  try {
    const outcome = await healAndPublish(pageId, base);
    return NextResponse.json(outcome, { status: outcome.published ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { error: "gate failed to run", detail: String(err) },
      { status: 500 },
    );
  }
}
