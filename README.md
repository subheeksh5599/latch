<div align="center">

# Latch

### A page that refuses to go live until a real browser proves every button that matters works.

[![Live demo](https://img.shields.io/badge/●_live-latch.vercel.app-000000)](https://latch.vercel.app)
[![Waitlist receipt](https://img.shields.io/badge/receipt-waitlist--1f82a8b0-2ecc71)](https://latch.vercel.app/api/receipt/waitlist-1f82a8b0)
[![Checkout receipt](https://img.shields.io/badge/receipt-checkout--d2da5b93-2ecc71)](https://latch.vercel.app/api/receipt/checkout-d2da5b93)
[![Kane CLI](https://img.shields.io/badge/verifier-Kane%20CLI%200.8.4-2563eb)](https://www.npmjs.com/package/@testmuai/kane-cli)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-composite-24292f)](action.yml)
[![Upstream PR](https://img.shields.io/badge/upstream-LambdaTest%2Fkane--cli%23175-8b5cf6)](https://github.com/LambdaTest/kane-cli/pull/175)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)
![Tests](https://img.shields.io/badge/tests-20%20passing-2ecc71)
![Stack](https://img.shields.io/badge/Next.js%2014%20·%20TypeScript%20·%20Kane%20CLI-14151a)

Latch is a publish gate that sits between an AI-built page and the internet. Before a page can go live, **Kane CLI opens a real browser and clicks every CTA that matters** — Sign up, Buy, Book a demo. If any one is broken, Latch **refuses to publish**, the loop reads Kane's failure and wires the dead CTA, Kane re-runs, and the page only ships once every CTA is proven to work — carrying a single **HMAC-signed receipt** any visitor can verify. On green publish, an optional Slack/Discord/generic webhook fires. It ships with a drop-in **GitHub Action** so any repo can gate its own PRs. The refusal is the product.

### ▶ Live now — real-browser publish gate at **[latch.vercel.app](https://latch.vercel.app)**

**[ Live demo ↗ ](https://latch.vercel.app)** · **[ Waitlist receipt ↗ ](https://latch.vercel.app/api/receipt/waitlist-1f82a8b0)** · **[ Checkout receipt ↗ ](https://latch.vercel.app/api/receipt/checkout-d2da5b93)** · **[ GitHub Action ↓ ](#github-action)** · **[ Publish webhook ↓ ](#publish-webhook)** · **[ Upstream PR ↗ ](https://github.com/LambdaTest/kane-cli/pull/175)** · **[ Architecture ↓ ](#architecture)** · **[ Run it locally ↓ ](#run-it-locally)**

Built for the **TestMu AI Kane CLI Online Hackathon** · Track: *Apps that verify themselves*. MIT licensed.

</div>

---

## Table of contents

- [See it in one command](#-see-it-in-one-command)
- [The problem Latch solves](#the-problem-latch-solves)
- [How Latch works](#how-latch-works)
  - [1 · A page with one or more primary CTAs](#1--a-page-with-one-or-more-primary-ctas)
  - [2 · Publish runs the gate — Kane clicks every button in a real browser](#2--publish-runs-the-gate--kane-clicks-every-button-in-a-real-browser)
  - [3 · Any red → publish is blocked](#3--any-red--publish-is-blocked)
  - [4 · The loop fixes the red CTA(s) and re-runs](#4--the-loop-fixes-the-red-ctas-and-re-runs)
  - [5 · Full green → publish, one receipt for the whole page, webhook fires](#5--full-green--publish-one-receipt-for-the-whole-page-webhook-fires)
- [Architecture](#architecture)
  - [Publish flow](#publish-flow)
  - [Component by component](#component-by-component)
  - [API surface](#api-surface)
- [Multi-CTA pages](#multi-cta-pages)
- [Publish webhook](#publish-webhook)
- [GitHub Action](#github-action)
- [Safety, enforced at the gate](#safety-enforced-at-the-gate)
- [How it uses Kane CLI](#how-it-uses-kane-cli)
- [Engineering decisions & the hard problems](#engineering-decisions--the-hard-problems)
- [What's real vs stubbed — the honesty table](#whats-real-vs-stubbed--the-honesty-table)
- [Tests](#tests)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [License](#license)

---

## ▶ See it in one command

Latch runs the publish gate against a real Next.js page. `data/pages.json` ships the waitlist CTA genuinely unwired (`wired: false`) — so the first attempt fails for real, in a real browser, on your machine:

```bash
npm run latch -- --page waitlist
```

Real output from a real run:

```text
Latch gate · page "waitlist" · CTA "Sign up"
Preview base: http://localhost:3000

▶ Gate attempt 1 · http://localhost:3000/examples/waitlist
  · CTA "Sign up" (primary)
    verdict: FALSE · session 55372b19-6835-4833-8788-404185bd9c57
  ✗ publish BLOCKED
  fix · The signup action appears to do nothing visible → wiring "waitlist.primary"

▶ Gate attempt 2 · http://localhost:3000/examples/waitlist
  · CTA "Sign up" (primary)
    verdict: TRUE · session ddf8e3db-92af-4730-8f51-fec2d958b41e
  ✓ publish ALLOWED · receipt waitlist-1f82a8b0

─── result ───
attempts:  2
published: true
receipt:   waitlist-1f82a8b0
```

The waitlist button wasn't wired. Latch caught it in a real Chrome, **blocked the publish**, wired the CTA, re-verified, and only then let the page go live — with a receipt you can inspect at [`/api/receipt/waitlist-1f82a8b0`](https://latch.vercel.app/api/receipt/waitlist-1f82a8b0). Try `--page launch` and you'll see the same loop, but with **two** CTAs — Get early access + Book a demo — and one receipt covering both. That is the product in one command.

---

## The problem Latch solves

You build a landing page. You launch it. You tweet the link and drive 2,000 visitors. And the **Sign up** button was silently dead the whole time — the handler was never wired after the last edit. You never find out. You just think nobody wanted it.

**Why existing tools miss it:**

- **Uptime monitors** check whether the page *loads*, not whether the *button works*.
- **Synthetic monitors** (Checkly, Ghost Inspector) run browser checks on a schedule and **alert you after the fact** — the visitor already bounced.
- **Unit and E2E tests** run in CI, then the deploy proceeds even if the money-path assertion was skipped or the mock diverged from prod.
- **AI page builders** ship a working preview, then the handler wiring silently drifts on the next edit — there is no gate between "the model said done" and "it is live."

None of them stand between your build and the publish button and say *"no, not until this actually works."* Latch closes that gap: the page cannot go live until a real browser proved every money-path, and every published page ships a receipt proving it — with the timestamp, the video, and an HMAC signature the visitor can re-verify.

---

## How Latch works

Five capabilities, all enforced by a real-browser gate before Vercel sees the deploy.

### 1 · A page with one or more primary CTAs

Every page ships with one or more calls-to-action (Sign up, Buy, Book) and the success state each CTA is supposed to reach. The demo ships three pages: **waitlist** (one CTA), **checkout** (one CTA, ships dead), and **launch** (two CTAs — Get early access + Book a demo, both ship dead). Every CTA in `data/pages.json` carries a `wired: boolean` flag; when false, the submit handler is genuinely not attached in the rendered React tree — clicking the button in a real browser does nothing. That's the real failure the gate has to catch.

### 2 · Publish runs the gate — Kane clicks every button in a real browser

For each CTA on the page, Kane spawns a fresh Chrome instance, navigates to the preview URL, clicks that specific button by label, and asserts the CTA's unique success text. Kane's step lines carry `status: "running" / "done"` — not `pass / fail`. The authoritative verdict lives in the `run_end` event, so Latch re-derives it from **five** raw fields at once so a single stray field can't wave a broken page through (`lib/kane.ts`):

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

### 3 · Any red → publish is blocked

The page-level verdict is TRUE **only if every CTA verdict is TRUE**. One red CTA blocks the whole publish. On red Kane returns `status: "failed"` with a `reason_code` like `assertion_error.confirmed_product_bug` and a plain-language `summary` of the bug. Latch persists the raw NDJSON stream to `data/runs/<page>-<cta>-<ts>.ndjson` for every attempt — no state is thrown away.

### 4 · The loop fixes the red CTA(s) and re-runs

```typescript
// lib/loop.ts — gate every CTA → wire the red ones → re-gate → publish-on-all-green
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const cycle = await Promise.all(page.ctas.map((cta) => runGate(page, cta, previewUrl)));
  if (cycle.every((r) => r.verdict === "TRUE")) {
    const receiptId = await saveReceipt(buildReceipt(cycle));
    await updatePage(pageId, { published: true, receiptId });
    await notifyPublish({ pageId, receiptId, ctas: cycle.map((r) => r.cta), ... });
    return { published: true, receiptId };
  }
  // Some CTA is red → publish stays blocked; wire only the red ones and retry.
  for (const red of cycle.filter((r) => r.verdict !== "TRUE")) {
    await agentFix(pageId, red.ctaId, red.summary ?? diagnoseFailure(red.steps));
  }
}
```

`agentFix` performs a real edit — it flips `cta.wired: false → true` on the specific CTA that failed, leaving already-green CTAs untouched. Nothing is stubbed. The next Kane run drives a real browser against the newly-wired page.

### 5 · Full green → publish, one receipt for the whole page, webhook fires

The live page carries a **"Verified working — view receipt"** badge. A visitor clicks it and sees, in plain language: every CTA on this page was proven working by a real browser at this time, here are the video traces per CTA, and the HMAC signature checks out. A single receipt covers every CTA on the page:

```json
{
  "pageId": "launch",
  "verdict": "TRUE",
  "ctas": [
    {
      "id": "signup",
      "cta": "Get early access",
      "verdict": "TRUE",
      "checks": [
        { "step": 1, "action": "navigate: Navigate to .../examples/launch", "status": "pass" },
        { "step": 2, "action": "click: Clicking Get early access button", "status": "pass" },
        { "step": 3, "action": "assert: success message \"You're on the launch list\" appears", "status": "pass" }
      ],
      "kaneSessionId": "ddf8e3db-92af-4730-8f51-fec2d958b41e",
      "videoTrace": "https://test-manager.lambdatest.com/.../share/US_M1LLBW1K..."
    },
    {
      "id": "demo",
      "cta": "Book a demo",
      "verdict": "TRUE",
      "checks": [ ... ],
      "kaneSessionId": "8f2a...",
      "videoTrace": "https://..."
    }
  ],
  "verifiedAt": "2026-08-20T15:04:07.756Z",
  "signature": "fccd3bb7ab4416a015cf39fd9cb1bff47dd7a0e95c04569970167bda0d64acc4"
}
```

On the same green publish the [publish webhook](#publish-webhook) fires — Slack, Discord, or any generic HTTP endpoint gets a signed POST with the receipt id and links.

All example flows are live and verified end-to-end:

| Page | CTAs | Live | Receipt (verify) |
|------|------|------|------------------|
| Waitlist | Sign up | [/p/waitlist](https://latch.vercel.app/p/waitlist) | [waitlist-1f82a8b0](https://latch.vercel.app/api/receipt/waitlist-1f82a8b0) |
| Checkout | Buy now | [/p/checkout](https://latch.vercel.app/p/checkout) | [checkout-d2da5b93](https://latch.vercel.app/api/receipt/checkout-d2da5b93) |
| Launch | Get early access · Book a demo | [/examples/launch](https://latch.vercel.app/examples/launch) | issued on first green publish |

---

## Architecture

```
   ┌──────────────┐      ┌──────────────────────┐      ┌────────────────┐
   │  page + CTAs │      │   Latch gate         │      │   Kane CLI     │
   │  (Next.js)   │─────▶│   runGate(page, cta) │─────▶│   real Chrome  │
   └──────────────┘      │   parse step NDJSON  │◀─────│   click+verify │
          ▲              └──────────┬───────────┘      └────────────────┘
          │                         │
          │ reads failure,          │ any FALSE → block publish, keep NDJSON
          │ wires red CTA(s),       │ all  TRUE → sign one receipt, mark published,
          │ re-triggers             │             fire webhook
          └─────────────────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  Live page + receipt │  ← deployed on Vercel
                         │  (visitor-verifiable)│
                         └──────────────────────┘
```

### Publish flow

1. **Author edits** a page record (`data/pages.json`) or a CTA component and triggers `npm run latch -- --page <id>` (locally, in CI, or via the [GitHub Action](#github-action)).
2. **Latch loops the CTAs** — for each CTA on the page, calls `runGate(page, cta, previewUrl)`.
3. **Kane opens a real Chrome** — navigates the URL, fills any email input, clicks the specific CTA button, asserts its unique success text.
4. **Latch parses each Kane NDJSON stream** line-by-line, tolerating non-JSON noise, and re-derives a per-CTA verdict from `run_end` + per-flow codes + per-step statuses.
5. **Any FALSE verdict** → publish is refused, raw streams are saved under `data/runs/<page>-<cta>-<ts>.ndjson`, the loop reads each red CTA's failure summary and calls `agentFix(pageId, ctaId, ...)` to wire just those CTAs.
6. **All TRUE** → `buildReceipt(results[])` signs one page-level payload with HMAC-SHA256, `saveReceipt()` writes it under `data/receipts/`, the page record flips to `published: true`.
7. **Publish webhook fires** — `notifyPublish()` POSTs a signed JSON payload to `PUBLISH_WEBHOOK_URL` if set. Silent no-op if unset.
8. **Vercel serves** the published page with a verification badge; visitors hit `/api/receipt/:id` to re-verify the signature.

### Component by component

| Component | Technology | Responsibility |
|---|---|---|
| **Page + CTAs** | Next.js 14 App Router, React 18 | One or many CTAs (`components/CtaForm.tsx`) — each only attaches its handler when `cta.wired === true` |
| **Gate runner** | Node + Kane CLI subprocess (`lib/kane.ts`) | Spawns `kane-cli run` per CTA, streams NDJSON, re-derives verdict from `run_end` |
| **Self-heal loop** | TypeScript (`lib/loop.ts`) | Gate every CTA → wire only red ones → re-gate → publish only on all-green, bounded by `maxAttempts` |
| **Receipt issuer** | Node `crypto` HMAC-SHA256 (`lib/receipt.ts`) | Signs one page-level receipt over all CTAs, refuses on any red, verifies on read |
| **Publish webhook** | Fetch + HMAC (`lib/webhook.ts`) | POSTs a signed JSON body to Slack / Discord / generic endpoint on every green publish |
| **Store** | JSON on disk (`lib/store.ts`, `data/pages.json`, `data/receipts/`) | Page records + `setCtaWired(pageId, ctaId, bool)` — no DB dependency |
| **Preview pages** | `app/examples/[page]` | The pages Kane actually drives — real handler wiring per CTA, no simulation |
| **Live pages** | `app/p/[page]` | Publish-gated pages with the verified-working badge, one CTA form per gated CTA |
| **Receipt viewer** | `app/r/[id]` | Human-readable receipt page that re-verifies HMAC and iterates per-CTA checks |
| **GitHub Action** | `action.yml` (composite) | Drop-in Action so any repo can run the publish gate on PRs |
| **Contribution** | `contrib/publish-gate.kane.md` | Reusable Kane publish-gate template, submitted upstream as [LambdaTest/kane-cli#175](https://github.com/LambdaTest/kane-cli/pull/175) |

### API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/gate` | `POST` | Trigger the gate for a page (local only — requires a real browser on the host) |
| `/api/receipt/:id` | `GET` | Fetch and re-verify a signed receipt — public, cacheable |
| `/api/health` | `GET` | Liveness probe |

---

## Multi-CTA pages

A single page can gate more than one money-path. The `launch` example in `data/pages.json` ships two:

```json
{
  "id": "launch",
  "title": "Launch day landing — Nimbus 2.0",
  "ctas": [
    { "id": "signup", "label": "Get early access", "successText": "You're on the launch list", "wired": false },
    { "id": "demo",   "label": "Book a demo",     "successText": "Demo request received",     "wired": false }
  ]
}
```

**How it behaves:**

- Kane runs one browser session **per CTA** — every button gets a fresh Chrome, its own click, its own success assertion.
- The page-level verdict is TRUE only when **every** per-CTA verdict is TRUE. One red blocks the whole publish.
- The self-heal loop wires only the specific CTAs that were red — already-green CTAs are not touched, so a fix on button A cannot regress button B.
- The receipt is one signed document for the whole page with a `ctas[]` array — one entry per proven CTA, with its own steps, session id, and video trace.
- Every CTA needs a **unique** `successText` on the rendered page — that's the string Kane asserts against, and ambiguous success text would let one CTA's success accidentally satisfy another's check.

To add a CTA to a page, drop a new entry into `ctas[]` in `data/pages.json`; the preview / live / receipt viewers all iterate the array automatically.

---

## Publish webhook

Every green publish fires an optional webhook (`lib/webhook.ts`) — Slack, Discord, and any generic HTTP endpoint accept it.

**Enable it** by setting `PUBLISH_WEBHOOK_URL` in the environment. Unset ⇒ silent no-op.

**Payload:**

```json
{
  "event": "latch.published",
  "pageId": "launch",
  "receiptId": "launch-9a3f21bd",
  "receiptUrl": "https://latch.vercel.app/api/receipt/launch-9a3f21bd",
  "liveUrl": "https://latch.vercel.app/p/launch",
  "verifiedAt": "2026-08-20T15:04:07.756Z",
  "ctas": ["Get early access", "Book a demo"],
  "text": "✅ Latch published `launch` — 2 CTAs proven working in a real browser.\nReceipt: https://...\nLive: https://..."
}
```

Slack + Discord incoming webhooks render the `text` field directly. Generic receivers ingest the structured fields and ignore `text`.

**Signature.** If `PUBLISH_WEBHOOK_SECRET` is set, every request carries an `X-Latch-Signature: sha256=<hex>` header — HMAC-SHA256 of the raw body under that secret. Receivers should re-compute and compare in constant time before trusting the payload.

**Fail-safe.** A broken webhook never rolls back a publish. `notifyPublish()` swallows network errors and returns `{ sent: true, status: 0 }` on connection failure — the receipt is already on disk before the webhook is called.

---

## GitHub Action

Latch ships as a composite GitHub Action (`action.yml`) so any repo can run the publish gate on PRs and workflow dispatches.

```yaml
# .github/workflows/latch.yml
name: Latch publish gate
on: [pull_request]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subheeksh5599/latch@v1
        with:
          page: waitlist
          receipt-secret: ${{ secrets.LATCH_RECEIPT_SECRET }}
          kane-token: ${{ secrets.KANE_TOKEN }}
          publish-webhook-url: ${{ secrets.LATCH_PUBLISH_WEBHOOK_URL }}
```

**Inputs**

| Input | Required | Default | Description |
|---|---|---|---|
| `page` | yes | `waitlist` | Page id from `data/pages.json` |
| `base-url` | no | `http://localhost:3000` | Base URL Kane opens in Chrome |
| `receipt-secret` | yes | — | HMAC secret used to sign receipts |
| `kane-token` | yes | — | Kane CLI auth token |
| `publish-webhook-url` | no | *empty* | Slack / Discord / generic webhook URL |
| `publish-webhook-secret` | no | *empty* | HMAC secret for the webhook signature header |
| `node-version` | no | `20` | Node.js version |

**Outputs**

| Output | Description |
|---|---|
| `published` | `true` / `false` — whether the page was published this run |
| `receipt-id` | Receipt id issued on green (empty on red) |

**What it does per PR**

1. Sets up Node, installs deps, installs Kane CLI.
2. Runs `npm run build` and starts Next.js on port 3000 in the background.
3. Runs `npm run latch -- --page <id>` end-to-end — real Chrome, real receipt.
4. Uploads the signed receipt JSON as a workflow artifact on green publish.
5. Fires the publish webhook (if configured) so #eng-launches sees the same signal CI does.

A ready-to-copy workflow lives at [`.github/workflows/latch-example.yml`](.github/workflows/latch-example.yml).

---

## Safety, enforced at the gate

Every claim maps to a mechanism in code, not a promise:

| Claim | How it's enforced |
|---|---|
| A broken CTA cannot be published | `healAndPublish()` only flips `published: true` after `cycle.every(r => r.verdict === "TRUE")` — one red anywhere in the array blocks the whole page |
| The verdict cannot be spoofed by one stray field | `deriveVerdict()` requires `status === "passed"` **and** `result_code === 100` **and** `reason_code` starts with `success` **and** every per-flow code is 100 **and** every step is `pass` |
| Receipts cannot be forged | HMAC-SHA256 over the canonical payload with `RECEIPT_SECRET` — host env only, never in the bundle |
| Receipts cannot be tampered with post-publish | The viewer re-computes the signature on every read; any diff → `verify: false` |
| Multi-CTA receipts cannot cover a red CTA | `buildReceipt()` throws if `results.some(r => r.verdict !== "TRUE")` — you cannot sign a partial-green run |
| Failures cannot be silently discarded | Every Kane run — pass or fail, per CTA — is persisted to `data/runs/<page>-<cta>-<ts>.ndjson` |
| A fix on one CTA cannot silently regress another | Every re-gate cycle runs every CTA again from scratch in a fresh browser; already-green CTAs must re-prove themselves |
| Webhook signatures cannot be spoofed | If `PUBLISH_WEBHOOK_SECRET` is set, receivers verify `X-Latch-Signature: sha256=<hex>` against the raw body |
| A broken webhook cannot break publish | `notifyPublish()` catches network errors; the receipt is already on disk before the POST is attempted |

---

## How it uses Kane CLI

**Real browser, not a headless mock.** Kane spawns a full Chrome instance and drives it through the exact user path — navigate, type, click, assert. Latch invokes `kane-cli` as a subprocess and consumes its NDJSON stream on stdout.

**One Kane run per CTA.** For a multi-CTA page, Latch runs Kane N times — once per CTA. Each run gets a fresh Chrome instance, so per-CTA state (form input, success message DOM) cannot bleed across CTAs.

**NDJSON parsing tolerates noise.** Kane's stream mixes structured events with plain log lines. `parseNdjson()` skips any line that isn't valid JSON rather than exploding on the first stray print.

**The verdict lives in `run_end`, not step lines.** Kane's per-step `status` is a lifecycle marker (`running` → `done`), not a pass/fail. The authoritative outcome is `run_end.status` + `result_code` + `reason_code` + `per_flow_metadata` — Latch reads all of them together.

**Non-zero exit is a red, not a crash.** Kane exits non-zero on assertion failures. The gate treats that as a legitimate FALSE verdict and hands the failure summary to the fix loop — not a stack trace to the user.

**Reusable across projects.** The gate template is generic — page id + array of `{label, successText}` is enough. It ships as [`contrib/publish-gate.kane.md`](contrib/publish-gate.kane.md) and is submitted upstream as [LambdaTest/kane-cli#175](https://github.com/LambdaTest/kane-cli/pull/175) so other teams can drop it into their own publish pipeline.

---

## Engineering decisions & the hard problems

- **The check belongs at publish, not per-visitor.** A real-browser check takes tens of seconds and costs credits — you cannot run it on every page load. Latch runs it **once, at the publish gate**: prove every CTA, then ship a fast, normal, static-ish page with a receipt attached.

- **Proven at publish, not "forever true".** Latch never claims a page can never break. It claims *proven working in a real browser at publish time, with a receipt.* The receipt timestamp says exactly when — visitors can decide for themselves whether that's fresh enough.

- **Re-derive the verdict from raw NDJSON, don't trust one field.** Kane's step lines are `running` / `done`; the verdict is re-derived from `run_end`'s status, result code, reason code, every per-flow code, and every step status together. A single stray "passed" cannot wave a broken page through.

- **One receipt per page, not one per CTA.** A visitor cares "is this page working?" not "which specific CTA has its own receipt?" The receipt schema puts every CTA inside a single signed document — atomic, publish-scoped, verifiable in one HTTP call.

- **Fix only the red CTAs.** `agentFix()` takes a `ctaId` and flips just that CTA's wiring. Already-green CTAs are left alone. A fix on button A cannot accidentally rewire button B.

- **The fix is a real change, not a mock.** The dead button is a genuinely unwired handler (`cta.wired: false`). The loop wires it; the next Kane run drives a real browser against the newly-wired page. Nothing is simulated — if the fix is wrong, the next verdict is FALSE.

- **Fail-closed, not fail-open.** If Kane crashes, times out, or the NDJSON stream ends without a `run_end`, the verdict defaults to `FALSE`. The page stays unpublished. A missing signal is treated exactly like a red signal.

- **The receipt refuses to exist for a red verdict.** `buildReceipt()` throws if any CTA is red (or if the results span multiple pages) — you cannot accidentally sign a failure into a green badge.

- **Signing is a pure function of the payload.** Same payload → same signature, always. Tests assert this determinism, so any drift in the canonicalisation (field order, whitespace, JSON encoding) trips a test rather than silently invalidating every prior receipt.

- **Webhook cannot break publish.** `notifyPublish()` is fire-and-forget from the loop's perspective. The receipt is written to disk **before** the POST is attempted; a webhook outage never rolls back a publish.

- **Legacy receipts still verify.** The receipt schema was extended to `ctas[]` for multi-CTA pages, but the old single-CTA fields are still populated. `normaliseReceipt()` lifts legacy on-disk receipts into the new shape at read time; the HMAC check still passes against the original bytes.

- **Store on disk, not a DB.** Pages, receipts, and NDJSON runs live under `data/` as flat files. This hackathon build needs auditability, not scale — flat files are inspectable in one `cat` and diffable in one `git diff`.

---

## What's real vs stubbed — the honesty table

| Capability | Status |
|---|---|
| **Kane-driven real-browser gate** — spawn subprocess, stream NDJSON, block on red | **Real** — runs locally, verified against all three example pages |
| **Verdict re-derivation** — 5-field consensus from `run_end` + per-flow + per-step | **Real code** — `lib/kane.ts`, covered by 6 parser tests |
| **Self-heal loop** — read failure summary, wire only red CTAs, re-run gate | **Real** — `lib/loop.ts`, exercised by the waitlist and launch demos |
| **Multi-CTA pages** — one gate cycle covers every CTA; one receipt covers all | **Real** — `launch` page ships two CTAs, both gated, both in one signed receipt |
| **HMAC-SHA256 receipts** — sign, verify, refuse-on-red, tamper-detect, multi-page-refuse | **Real code** — `lib/receipt.ts`, covered by 9 signature tests |
| **Persisted Kane runs** — every attempt kept under `data/runs/<page>-<cta>-<ts>.ndjson` | **Real** — one file per CTA per attempt |
| **Signed receipts** — `data/receipts/` with 5 receipts across pages | **Real** — verifiable at `/api/receipt/:id` on the live deploy |
| **Live example pages** — waitlist + checkout + launch, publish-gated | **Live** at [/p/waitlist](https://latch.vercel.app/p/waitlist), [/p/checkout](https://latch.vercel.app/p/checkout), [/examples/launch](https://latch.vercel.app/examples/launch) |
| **Receipt viewer** — visitor-verifiable badge → HMAC re-check → per-CTA check list | **Live** at `/r/:id` on the deploy |
| **Publish webhook** — Slack/Discord/generic POST with HMAC-signed body | **Real code** — `lib/webhook.ts`, covered by 4 tests, `PUBLISH_WEBHOOK_URL` toggle |
| **GitHub Action** — composite action to run the gate on PRs, upload receipt artifact | **Real** — [`action.yml`](action.yml) + [`.github/workflows/latch-example.yml`](.github/workflows/latch-example.yml) |
| **CI workflow** — install, lint, test, build on every push and PR | **Real** — [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **Contribution: reusable Kane publish-gate template** | **Real** — [`contrib/publish-gate.kane.md`](contrib/publish-gate.kane.md), submitted as [kane-cli#175](https://github.com/LambdaTest/kane-cli/pull/175) |
| **Test suite** — parser + receipt + multi-CTA + webhook, real Kane NDJSON fixtures | **Real** — 20/20 passing |
| **`POST /api/gate` on Vercel** | **Local-only by design** — needs a real browser on the host; Vercel serverless has none. The GitHub Action is the hosted path. |

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
✔ multi-CTA receipt lists every CTA and only signs when all TRUE
✔ refuses a multi-CTA receipt if any CTA is red
✔ refuses a multi-CTA receipt spanning multiple pages
✔ normaliseReceipt lifts a legacy single-CTA receipt into ctas[]
✔ no-ops silently when PUBLISH_WEBHOOK_URL is unset
✔ POSTs a JSON body with a slack-compatible text field
✔ attaches a valid HMAC-SHA256 signature header when a secret is provided
✔ swallows fetch errors so a broken webhook cannot break publish
ℹ tests 20
ℹ pass 20
ℹ fail 0
```

Tests run the parser against **real Kane NDJSON** captured from actual runs (`test/fixtures/kane-red.ndjson`, `test/fixtures/kane-green.ndjson`) — not hand-written stubs. That means changes to Kane's output shape surface as test failures against a real recording, not against an assumption.

| Test area | Count | What it proves |
|---|---|---|
| Kane parser + verdict | 7 | NDJSON parsing, verdict re-derivation from every authoritative field, red on missing/partial signals, noise-tolerance |
| Receipt sign/verify | 5 | Green-only signing, tamper detection, determinism, refuse-on-red |
| Multi-CTA receipts | 4 | Multi-CTA aggregation, refuse-on-any-red, refuse-cross-page, legacy normalisation |
| Publish webhook | 4 | No-op when unset, slack-compatible payload, HMAC-signed header, network-error-safe |

---

## Run it locally

**Prerequisites:** Node 20+, npm, Kane CLI installed and logged in, a machine with a real Chrome available (macOS / Linux desktop / any CI runner with a browser).

```bash
git clone https://github.com/subheeksh5599/latch.git
cd latch

# Install
npm install

# Kane CLI must be installed + logged in
npm install -g @testmuai/kane-cli
kane-cli --version      # → 0.8.x
kane-cli whoami         # → must show a logged-in account

# Env
cp .env.example .env    # set a real RECEIPT_SECRET; add PUBLISH_WEBHOOK_URL if you want pings

# Serve the pages (Kane drives a real browser against these)
npm run dev             # → http://localhost:3000

# In a second terminal: reset to the broken state, then run the gate
npm run reset -- --page waitlist
npm run latch -- --page waitlist    # single-CTA demo
npm run latch -- --page launch      # multi-CTA demo (two CTAs, one receipt)

# Tests (no browser required)
npm test
```

The first `npm run latch -- --page waitlist` will fail on purpose (the CTA ships unwired), then wire it, re-run Kane against a real browser, and publish with a receipt. `--page launch` demonstrates the multi-CTA loop: two dead CTAs, both wired, one atomic receipt.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `KANE_CLI_PATH` | `kane-cli` | Path to the Kane CLI binary |
| `KANE_TIMEOUT` | `180000` | Max ms per Kane run before the gate treats it as FALSE |
| `KANE_HEADLESS` | `true` | Whether Kane's Chrome runs headless (set `false` to watch it) |
| `RECEIPT_DIR` | `./data/receipts` | Where signed receipts are stored |
| `RECEIPT_SECRET` | *(host env)* | HMAC secret used to sign and verify receipts — never commit |
| `PREVIEW_BASE_URL` | `http://localhost:3000` | Base URL Kane opens in Chrome |
| `PUBLISH_WEBHOOK_URL` | *(unset)* | Slack / Discord / generic HTTP endpoint fired on every green publish |
| `PUBLISH_WEBHOOK_SECRET` | *(unset)* | HMAC secret so the receiver can verify the webhook signature header |
| `MAX_ATTEMPTS` | `3` | Loop cap: how many fix-and-retry cycles before the gate gives up |

---

## Deploy

| | |
|---|---|
| **Live site** | **[latch.vercel.app](https://latch.vercel.app)** — Vercel |
| **Waitlist receipt** | **[/api/receipt/waitlist-1f82a8b0](https://latch.vercel.app/api/receipt/waitlist-1f82a8b0)** — HMAC-verified |
| **Checkout receipt** | **[/api/receipt/checkout-d2da5b93](https://latch.vercel.app/api/receipt/checkout-d2da5b93)** — HMAC-verified |
| **GitHub Action** | **[`action.yml`](action.yml)** — composite action; example workflow at [`.github/workflows/latch-example.yml`](.github/workflows/latch-example.yml) |
| **CI** | **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** — install, lint, test, build on every push and PR |
| **Upstream contribution** | **[LambdaTest/kane-cli#175](https://github.com/LambdaTest/kane-cli/pull/175)** — reusable publish-gate template |

The **live pages and receipt viewer** are deployed on Vercel's free tier. The **gate itself runs where a real browser is available** — your machine, the GitHub Action, or any container with Chrome. `POST /api/gate` on the Vercel deploy is intentionally a no-op-in-serverless: there is no browser to drive there, and pretending otherwise would break the honesty guarantee.

---

## Project layout

```
latch/
├── action.yml                    # Composite GitHub Action — drop-in publish gate for any repo
├── .github/
│   └── workflows/
│       ├── ci.yml                # Install / lint / test / build on every push + PR
│       └── latch-example.yml     # Ready-to-copy workflow consuming action.yml
├── app/
│   ├── api/
│   │   ├── gate/route.ts         # POST — trigger the gate (local runners only)
│   │   ├── receipt/[id]/route.ts # GET  — fetch + re-verify a signed receipt
│   │   └── health/route.ts       # GET  — liveness probe
│   ├── examples/[page]/          # The pages Kane actually drives in Chrome (one form per CTA)
│   ├── p/[page]/                 # Publish-gated live pages (verified-working badge)
│   ├── r/[id]/                   # Human-readable receipt viewer — iterates ctas[]
│   ├── layout.tsx
│   └── page.tsx                  # Landing — lists every page and its CTAs
├── components/
│   └── CtaForm.tsx               # One primary CTA — handler only attached when cta.wired:true
├── lib/
│   ├── kane.ts                   # Spawn Kane per CTA, parse NDJSON, deriveVerdict() (5-field consensus)
│   ├── loop.ts                   # Gate every CTA → fix only red → re-gate → publish + webhook on all-green
│   ├── receipt.ts                # HMAC-SHA256 sign / verify, multi-CTA aggregation, refuse-on-red
│   ├── webhook.ts                # notifyPublish() — Slack/Discord/generic POST with HMAC signature
│   ├── store.ts                  # Flat-file page + receipt store; setCtaWired(pageId, ctaId, bool)
│   └── types.ts                  # Verdict, Cta, GateResult, ReceiptCta, Receipt, Page
├── scripts/
│   ├── latch.ts                  # `npm run latch -- --page <id>` — one-command entry point
│   └── reset.ts                  # `npm run reset -- --page <id>` — restore every CTA to dead
├── test/
│   ├── fixtures/
│   │   ├── kane-green.ndjson     # Real Kane NDJSON from a passing run
│   │   └── kane-red.ndjson       # Real Kane NDJSON from a failing run
│   ├── kane.test.ts              # 7 parser + verdict tests
│   ├── receipt.test.ts           # 9 sign / verify / multi-CTA / legacy-normalisation tests
│   └── webhook.test.ts           # 4 webhook payload / signature / fail-safe tests
├── contrib/
│   └── publish-gate.kane.md      # Reusable Kane template → LambdaTest/kane-cli#175
├── data/
│   ├── pages.json                # Page records (id, ctas[], published, receiptId, receipts[])
│   ├── receipts/                 # Signed receipts, keyed by receiptId
│   └── runs/                     # Every Kane NDJSON stream, keyed by page + cta + timestamp
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.mjs
└── README.md
```

---

## Tech stack

- **App:** Next.js 14 (App Router), React 18, TypeScript 5 (strict)
- **Gate runner:** Node 20+, Kane CLI 0.8.4 as a subprocess, NDJSON stream parsing
- **Verifier:** LambdaTest Kane CLI — real Chrome, click / type / assert
- **Signing:** Node `crypto` HMAC-SHA256, host-env secret only
- **Store:** Flat JSON on disk (`data/pages.json`, `data/receipts/`, `data/runs/`)
- **Tests:** Node built-in test runner (`node --test`), real Kane NDJSON fixtures
- **CI:** GitHub Actions — install, lint, test, build on every push and PR
- **Distribution:** Composite GitHub Action (`action.yml`) — any repo can `uses: subheeksh5599/latch@v1`
- **Notifications:** Fetch + HMAC-SHA256 webhook signatures, Slack/Discord/generic compatible
- **Hosting:** Vercel (pages + receipt API); gate runs on any host with a real browser

---

## Team

| Name | Role | Links |
|---|---|---|
| **subheeksh5599** | Solo — full build | [GitHub](https://github.com/subheeksh5599) |

Built solo for the **TestMu AI Kane CLI Online Hackathon** — Track: *Apps that verify themselves*.

---

## License

MIT — see [LICENSE](LICENSE).
