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

  return (
    <main>
      <p className="muted">Preview · not yet published</p>
      <h1>{page.title}</h1>
      <p className="muted">
        One button that matters: <strong>{page.cta}</strong>. Publock will not
        let this page go live until a real browser proves it works.
      </p>
      <div className="panel">
        <CtaForm wired={page.wired} cta={page.cta} successText={page.successText} />
      </div>
    </main>
  );
}
