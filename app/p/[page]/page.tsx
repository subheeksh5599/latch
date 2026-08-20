import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/store";
import { CtaForm } from "@/components/CtaForm";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  params,
}: {
  params: { page: string };
}) {
  const page = await getPage(params.page);
  // Server-authoritative: only a genuinely published page renders here.
  if (!page || !page.published) notFound();

  return (
    <main>
      {page.receiptId && (
        <Link className="badge" href={`/r/${page.receiptId}`}>
          ✓ Verified working — view receipt
        </Link>
      )}
      <h1 style={{ marginTop: 20 }}>{page.title}</h1>
      <p className="muted">
        This button was proven working by a real browser before this page went
        live.
      </p>
      <div className="panel">
        <CtaForm wired={page.wired} cta={page.cta} successText={page.successText} />
      </div>
    </main>
  );
}
