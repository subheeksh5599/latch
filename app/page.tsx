import Link from "next/link";
import { listPages } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const pages = await listPages();

  return (
    <main>
      <h1>Provewall</h1>
      <p className="muted">
        A page that refuses to go live until a real browser proves its button
        works.
      </p>

      <div className="panel">
        <p>
          Before a page can publish, Provewall opens a <strong>real browser</strong>{" "}
          and clicks the one button that matters. If the button is broken, the
          publish is <span className="verdict-false">blocked</span>. Once it is
          proven working, the page goes live carrying a{" "}
          <span className="verdict-true">receipt</span> any visitor can verify.
        </p>
      </div>

      <h2 style={{ fontSize: 18 }}>Pages</h2>
      {pages.map((p) => (
        <div className="panel" key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{p.title}</strong>
            <span className={p.published ? "verdict-true" : "muted"}>
              {p.published ? "published" : "not published"}
            </span>
          </div>
          <p className="muted" style={{ marginBottom: 4 }}>
            CTA: {p.cta}
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <Link href={`/examples/${p.id}`}>Preview</Link>
            {p.published && <Link href={`/p/${p.id}`}>Live page</Link>}
            {p.receiptId && (
              <Link href={`/api/receipt/${p.receiptId}`}>Receipt</Link>
            )}
          </div>
        </div>
      ))}

      <p className="muted" style={{ fontSize: 13, marginTop: 32 }}>
        The publish gate runs a real browser locally (Kane needs a real Chrome),
        so it is triggered from the command line:{" "}
        <code>npm run provewall -- --page waitlist</code>.
      </p>
    </main>
  );
}
