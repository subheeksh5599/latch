import { notFound } from "next/navigation";
import { getPage } from "@/lib/store";
import { CtaForm } from "@/components/CtaForm";

export const dynamic = "force-dynamic";

export default async function Preview({
  params,
}: {
  params: { page: string };
}) {
  const page = await getPage(params.page);
  if (!page) notFound();

  const ctaLabels = page.ctas.map((c) => `"${c.label}"`).join(" · ");
  const multi = page.ctas.length > 1;

  return (
    <main>
      <p className="muted">Preview · not yet published</p>
      <h1>{page.title}</h1>
      <p className="muted">
        {multi ? "Buttons that matter" : "One button that matters"}: <strong>{ctaLabels}</strong>.
        Latch will not let this page go live until a real browser proves every one works.
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
