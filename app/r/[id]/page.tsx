import { notFound } from "next/navigation";
import { loadReceipt, normaliseReceipt, verifyReceipt } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export default async function ReceiptView({
  params,
}: {
  params: { id: string };
}) {
  const raw = await loadReceipt(params.id);
  if (!raw) notFound();
  const valid = verifyReceipt(raw);
  const receipt = normaliseReceipt(raw);
  const ctas = receipt.ctas;

  return (
    <main>
      <p className="muted">Latch receipt</p>
      <h1>
        {valid ? (
          <span className="verdict-true">✓ Signature valid</span>
        ) : (
          <span className="verdict-false">✗ Signature invalid</span>
        )}
      </h1>
      <p>
        {ctas.length === 1 ? (
          <>
            The <strong>{ctas[0].cta}</strong> button on this page was proven
            working by a real browser at{" "}
            <strong>{new Date(receipt.verifiedAt).toLocaleString()}</strong>.
          </>
        ) : (
          <>
            All <strong>{ctas.length}</strong> CTAs on this page were proven
            working by a real browser at{" "}
            <strong>{new Date(receipt.verifiedAt).toLocaleString()}</strong>.
          </>
        )}
      </p>

      {ctas.map((c) => (
        <div className="panel" key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{c.cta}</strong>
            <span className={c.verdict === "TRUE" ? "verdict-true" : "verdict-false"}>
              {c.verdict === "TRUE" ? "✓ TRUE" : "✗ FALSE"}
            </span>
          </div>
          {c.checks.map((s) => (
            <div className="step" key={s.step}>
              <span className={s.status === "pass" ? "verdict-true" : "verdict-false"}>
                {s.status === "pass" ? "✓" : "✗"}
              </span>
              <span>
                Step {s.step}: {s.action}
              </span>
            </div>
          ))}
          {c.videoTrace && (
            <p style={{ marginTop: 8 }}>
              Watch the real browser run:{" "}
              <a href={c.videoTrace}>video trace</a>
            </p>
          )}
        </div>
      ))}

      <details>
        <summary className="muted">Raw signed receipt</summary>
        <pre>{JSON.stringify(raw, null, 2)}</pre>
      </details>
    </main>
  );
}
