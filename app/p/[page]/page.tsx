import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/store";
import { loadReceipt } from "@/lib/receipt";
import { CtaForm } from "@/components/CtaForm";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  params,
}: {
  params: { page: string };
}) {
  const page = await getPage(params.page);
  // Server-authoritative: render only when a real Kane receipt exists for this
  // page — either the current `published` cycle or a historical run in
  // `receipts[]`. The receipt is the proof; `published` is a convenience flag.
  const receiptId = page?.receiptId ?? page?.receipts?.at(-1) ?? null;
  if (!page || !receiptId) notFound();
  const receipt = await loadReceipt(receiptId);
  const verifiedAt = receipt?.verifiedAt ?? null;

  return (
    <main>
      <Link className="badge" href={`/r/${receiptId}`}>
        ✓ Verified working — view receipt
      </Link>
      <h1 style={{ marginTop: 20 }}>{page.title}</h1>
      <p className="muted">
        {page.ctas.length > 1
          ? "Every button on this page was proven working"
          : "This button was proven working"}{" "}
        by a real browser
        {verifiedAt ? ` at ${new Date(verifiedAt).toUTCString()}` : ""}.
        Latch never claims it stays working forever — the receipt says exactly when.
      </p>
      {page.ctas.map((cta) => (
        <div className="panel" key={cta.id}>
          <p className="muted" style={{ marginBottom: 8 }}>
            {cta.label}
          </p>
          <CtaForm cta={cta} />
        </div>
      ))}
    </main>
  );
}
