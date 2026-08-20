<div align="center">

# Provewall

**A page that refuses to go live until a real browser proves its button works.**

<p align="center">
  <a href="https://provewall.vercel.app"><strong>🔗 Live Demo</strong></a> &bull;
  <a href="https://github.com/subheeksh5599/provewall"><strong>📦 GitHub</strong></a> &bull;
  <a href="#see-it-in-one-command">See it in one command</a> &bull;
  <a href="#how-provewall-works">How it works</a> &bull;
  <a href="#run-it-locally">Run locally</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-Next.js%20%C2%B7%20TypeScript%20%C2%B7%20Kane%20CLI-black?style=flat-square">
  <img src="https://img.shields.io/badge/verifier-Kane%20CLI%200.8.4-blue?style=flat-square">
  <img src="https://img.shields.io/badge/tests-12%20passing-2ecc71?style=flat-square">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square">
</p>

Provewall sits between an AI-built page and the internet. Before a page can
publish, Kane CLI opens a **real browser** and clicks the one button that matters
— Sign up, Buy, Book. If that button is broken, Provewall **refuses to publish**,
the loop reads Kane's failure and fixes the wiring, Kane re-runs, and the page
only goes live once the button is proven to work — carrying a **receipt** any
visitor can verify. The refusal is the product.

Built for the TestMu AI Kane CLI Online Hackathon. Track: Apps that verify themselves. MIT licensed.

</div>

---

## The problem

You build a landing page. You launch it. You tweet the link and drive 2,000
visitors. And the **Sign up** button was silently dead the whole time — the
handler was never wired after the last edit. You never find out. You just think
nobody wanted it.

**Why existing tools miss it:** uptime monitors check whether the page *loads*,
not whether the *button works*. Synthetic monitors (Checkly, Ghost Inspector)
run browser checks on a schedule and **alert you after the fact** — the visitor
already bounced. None of them stand between your build and the publish button and
say "no, not until this actually works."

Provewall closes that gap: the page cannot go live until a real browser proved
the money-path, and every published page ships a receipt proving it.

---

## See it in one command

```bash
# Run the publish gate against the example page and watch Kane decide
npm run provewall -- --page waitlist
```

Real output from a real run (`data/pages.json` ships the waitlist button
genuinely unwired, so the first attempt fails for real):

```text
Provewall gate · page "waitlist" · CTA "Sign up"
Preview base: http://localhost:3000

▶ Gate attempt 1 · http://localhost:3000/examples/waitlist
  verdict: FALSE · session 4819dba9-f183-4697-980a-c3362cbe2a28
  ✗ publish BLOCKED
  fix · After submitting the form, the automation assumed the success message would appear right away. When it did not see that state quickly, it tried an extra Enter press and then ran out of useful actions. → wiring the "waitlist" CTA handler

▶ Gate attempt 2 · http://localhost:3000/examples/waitlist
  verdict: TRUE · session 01d446f1-f06f-46a3-975a-d00bd5546b8c
  ✓ publish ALLOWED · receipt waitlist-248c42ba

─── result ───
attempts:  2
published: true
receipt:   waitlist-248c42ba
```

The waitlist button wasn't wired. Provewall caught it in a real browser,
**blocked the publish**, wired the CTA, re-verified, and only then let the page
go live — with a receipt you can check at
[`/api/receipt/waitlist-248c42ba`](https://provewall.vercel.app/api/receipt/waitlist-248c42ba).

---

## How Provewall works

### 1 · A page with one primary CTA

A page with one call-to-action (Sign up / Buy) and the success state that CTA is
supposed to reach. The demo ships the button genuinely dead: its submit handler
was never wired, so clicking it does nothing.

### 2 · Publish runs the gate — Kane clicks the button in a real browser

Kane's step lines carry `status: "running"/"done"` — not pass/fail. The
authoritative verdict lives in the `run_end` event, so Provewall re-derives it from
several raw fields at once (`lib/kane.ts`):

```typescript
export function deriveVerdict(runEnd, steps): Verdict {
  if (!runEnd) return "FALSE";
  const statusOk = runEnd.status === "passed";
  const codeOk   = runEnd.result_code === 100;
  const reasonOk = runEnd.reason_code?.startsWith("success");
  const flows    = runEnd.per_flow_metadata ?? [];
  const flowsOk  = flows.length > 0 && flows.every(f => String(f.result_code) === "100");
  const stepsOk  = steps.length > 0 && steps.every(s => s.status === "pass");
  return statusOk && codeOk && reasonOk && flowsOk && stepsOk ? "TRUE" : "FALSE";
}
```

### 3 · Broken → publish is blocked

On a FALSE verdict the page **does not publish**. On the dead button Kane returns
`status: "failed"` with a `reason_code` like `assertion_error.confirmed_product_bug`
and a plain-language `summary` of the bug — which Provewall feeds back into the fix.

### 4 · The loop fixes it and re-runs

```typescript
// lib/loop.ts — build → gate → (if red) fix → re-gate → publish-on-green
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const result = await runGate(page, previewUrl);
  if (result.verdict === "TRUE") {
    const receiptId = await saveReceipt(buildReceipt(result));
    await updatePage(pageId, { published: true, receiptId });
    return { published: true, receiptId };
  }
  // FALSE → publish stays blocked; wire the CTA and try again
  await agentFix(pageId, result.summary ?? diagnoseFailure(result.steps));
}
```

### 5 · Green → publish + a receipt visitors can verify

The live page carries a **"Verified working — view receipt"** badge. A visitor
clicks it and sees, in plain language: this button was proven working by a real
browser at this time, here's the video, and the signature checks out.

```json
{
  "pageId": "waitlist",
  "cta": "Sign up",
  "verdict": "TRUE",
  "checks": [
    { "step": 1, "action": "navigate: Navigate to .../examples/waitlist", "status": "pass" },
    { "step": 2, "action": "type: Typing tester@provewall.dev into the email field", "status": "pass" },
    { "step": 3, "action": "click: Clicking the Sign up button below the email input", "status": "pass" },
    { "step": 4, "action": "assert: a success message containing \"You're on the list\" appears on the page", "status": "pass" }
  ],
  "kaneSessionId": "01d446f1-f06f-46a3-975a-d00bd5546b8c",
  "videoTrace": "https://test-manager.lambdatest.com/.../share/US_EQX5WC4N9ERW...",
  "verifiedAt": "2026-08-20T14:44:38.305Z",
  "signature": "045a8c61924cc443b0f5a0351755e870500dc179fa8141fd487b8eba22f6a474"
}
```

Both example flows are live and verified:

| Page | Live | Receipt (verify) |
|------|------|------------------|
| Waitlist (`Sign up`) | [/p/waitlist](https://provewall.vercel.app/p/waitlist) | [waitlist-248c42ba](https://provewall.vercel.app/api/receipt/waitlist-248c42ba) |
| Checkout (`Buy now`) | [/p/checkout](https://provewall.vercel.app/p/checkout) | [checkout-2cd751d2](https://provewall.vercel.app/api/receipt/checkout-2cd751d2) |

---

## Architecture

```
   ┌──────────────┐      ┌──────────────────────┐      ┌────────────────┐
   │  page + CTA   │      │   Provewall gate        │      │   Kane CLI      │
   │  (Next.js)    ├─────▶│  runGate() locally    ├─────▶│  real Chrome    │
   └──────────────┘      │  parse step NDJSON    │◀─────┤  click + verify │
          ▲              └──────────┬───────────┘      └────────────────┘
          │                         │
          │ reads failure,          │ FALSE → block publish
          │ wires CTA, re-triggers  │ TRUE  → publish + receipt
          └─────────────────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  Live page + receipt  │  ← deployed on Vercel
                         │  (visitor-verifiable) │
                         └──────────────────────┘
```

Kane drives a **real local Chrome**, so the gate and self-heal loop run on your
machine (or any runner with a browser) — not on serverless. Vercel hosts the
published pages and the visitor-verifiable receipts. `POST /api/gate` exists for
local triggering; it only works where a browser is available.

| Component | Tech | Responsibility |
|-----------|------|----------------|
| Page + CTA | Next.js / React | One primary CTA with a genuinely wire-able success state |
| Provewall gate | Node + Kane CLI | Run the real-browser check, parse NDJSON, re-derive verdict |
| Self-heal loop | TypeScript | Read Kane's failure, wire the CTA, re-verify |
| Receipt issuer | Node (HMAC-SHA256) | Sign a receipt on green; serve at `/api/receipt/:id` |
| Live page + badge | React | Publish only on green; show a visitor-verifiable receipt |

---

## Engineering decisions

**1 · The check belongs at publish, not per-visitor.** A real-browser check takes
tens of seconds and costs credits — you can't run it on every page load. Provewall
runs it **once, at the publish gate**: prove the button, then ship a fast normal
page with a receipt.

**2 · Proven at publish, not "forever true".** Provewall never claims a page can
never break. It claims: **proven working in a real browser at publish time, with
a receipt.** The receipt timestamp says exactly when.

**3 · Re-derive the verdict from raw NDJSON, don't trust one field.** Kane's step
lines are `running`/`done`; the verdict is re-derived from `run_end`'s status,
result code, reason code, and every per-flow code together — a single stray field
can't wave a broken page through.

**4 · The fix is a real change, not a mock.** The dead button is a genuinely
unwired handler (`wired: false`). The loop wires it; the next Kane run drives a
real browser against the newly-wired page. Nothing is simulated.

---

## Tests

```bash
npm test
```

```text
✔ parses a real green Kane NDJSON stream into pass steps
✔ derives TRUE when every authoritative run_end field agrees
✔ derives FALSE from a real red run (button never reached success)
✔ verdict is FALSE when run_end is missing entirely
✔ verdict is FALSE if status passed but result_code is not 100
✔ verdict is FALSE if any flow did not reach 100
✔ non-JSON noise lines are ignored, not fatal
✔ builds a receipt only for a TRUE verdict
✔ refuses to build a receipt for a FALSE verdict
✔ a freshly built receipt verifies
✔ tampering with the receipt breaks the signature
✔ signature is deterministic for the same payload
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

Tests run the parser against **real Kane NDJSON** captured from actual runs
(`test/fixtures/kane-red.ndjson`, `kane-green.ndjson`) — not hand-written stubs.

---

## Run it locally

```bash
# Clone
git clone https://github.com/subheeksh5599/provewall.git
cd provewall

# Install
npm install

# Kane CLI must be installed + logged in
npm install -g @testmuai/kane-cli
kane-cli --version                  # → 0.8.x
kane-cli whoami                     # → must show a logged-in account

# Env
cp .env.example .env                # set a real RECEIPT_SECRET

# Serve the pages (Kane opens a real browser against these)
npm run dev                         # → http://localhost:3000

# In a second terminal: reset to the broken state, then run the gate
npm run reset -- --page waitlist
npm run provewall -- --page waitlist

# Tests
npm test
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KANE_CLI_PATH` | `kane-cli` | Path to the Kane CLI binary |
| `KANE_TIMEOUT` | `180000` | Max ms per Kane run |
| `KANE_HEADLESS` | `true` | Run Kane's browser headless |
| `RECEIPT_DIR` | `./data/receipts` | Where signed receipts are stored |
| `RECEIPT_SECRET` | _(host env)_ | HMAC secret used to sign receipts |
| `PREVIEW_BASE_URL` | `http://localhost:3000` | Base URL Kane checks against |

---

## Security

- **No credentials in the bundle** — Kane token and `RECEIPT_SECRET` live in host
  env only, never in code, repo, or logs.
- **Publish state is server-authoritative** — a page flips to "published" only
  after a server-side green verdict, not a client flag.
- **Real failures, no simulation** — the demo's broken button is a genuine unwired
  handler; the receipt reflects a real browser run.
- **Signed receipts** — each receipt is HMAC-signed over its payload, so tampering
  is detectable; the live viewer re-verifies the signature.

---

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| Phase 1 — Hackathon MVP | One CTA flow, real Kane gate, block-on-red, self-heal, publish-on-green, receipt | ✅ Done |
| Phase 2 — Second flow | Buy/checkout money-path to the same depth | ✅ Done |
| Phase 3 — Re-verify + history | Gate re-runs each publish; every receipt kept in page history | ✅ Done |
| Phase 4 — Host contribution | Reusable Kane publish-gate template in [`contrib/`](contrib/publish-gate.kane.md), ready to submit upstream | ✅ Prepared |

---

## Team

| Name | Role | Links |
|------|------|-------|
| **subheeksh5599** | Solo — full build | [GitHub](https://github.com/subheeksh5599) |

Built solo for the **TestMu AI Kane CLI Online Hackathon** — Track: Apps that verify themselves.

---

## License

MIT — see [LICENSE](LICENSE).
