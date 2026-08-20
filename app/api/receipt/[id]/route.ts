import { NextResponse } from "next/server";
import { loadReceipt, verifyReceipt } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const receipt = await loadReceipt(params.id);
  if (!receipt) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }
  const valid = verifyReceipt(receipt);
  return NextResponse.json({ id: params.id, valid, receipt });
}
