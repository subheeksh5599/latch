import { notFound } from "next/navigation";
import { loadReceipt, verifyReceipt } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export default async function ReceiptView({
  params,
}: {
  params: { id: string };
}) {
  const receipt = await loadReceipt(params.id);
  if (!receipt) notFound();
  const valid = verifyReceipt(receipt);

  return (
    <main>
      <p className="muted">Publock receipt</p>
      <h1>
        {valid ? (
          <span className="verdict-true">✓ Signature valid</span>
        ) : (
          <span className="verdict-false">✗ Signature invalid</span>
        )}
      </h1>
      <p>
        The <strong>{receipt.cta}</strong> button on this page was proven working
        by a real browser at{" "}
        <strong>{new Date(receipt.verifiedAt).toLocaleString()}</strong>.
      </p>

      <div className="panel">
        {receipt.checks.map((s) => (
          <div className="step" key={s.step}>
            <span className={s.status === "pass" ? "verdict-true" : "verdict-false"}>
              {s.status === "pass" ? "✓" : "✗"}
            </span>
            <span>
              Step {s.step}: {s.action}
            </span>
          </div>
        ))}
      </div>

      {receipt.videoTrace && (
        <p>
          Watch the real browser run:{" "}
          <a href={receipt.videoTrace}>video trace</a>
        </p>
      )}

      <details>
        <summary className="muted">Raw signed receipt</summary>
        <pre>{JSON.stringify(receipt, null, 2)}</pre>
      </details>
    </main>
  );
}
