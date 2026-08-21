import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReceipt, signReceipt, verifyReceipt, normaliseReceipt } from "../lib/receipt";
import type { GateResult, Receipt } from "../lib/types";

const greenResult: GateResult = {
  pageId: "waitlist",
  ctaId: "primary",
  cta: "Sign up",
  verdict: "TRUE",
  steps: [
    { step: 1, action: "navigate", status: "pass" },
    { step: 2, action: "click Sign up", status: "pass" },
    { step: 3, action: "assert success", status: "pass" },
  ],
  sessionId: "test-session",
  videoTrace: "https://example.com/trace",
  rawPath: null,
  summary: null,
};

test("builds a receipt only for a TRUE verdict", () => {
  const receipt = buildReceipt(greenResult);
  assert.equal(receipt.verdict, "TRUE");
  assert.equal(receipt.pageId, "waitlist");
  assert.equal(receipt.ctas.length, 1);
  assert.equal(receipt.ctas[0].kaneSessionId, "test-session");
  assert.ok(receipt.signature.length === 64, "sha256 hex signature");
  assert.ok(receipt.verifiedAt, "has a timestamp");
});

test("refuses to build a receipt for a FALSE verdict", () => {
  assert.throws(() => buildReceipt({ ...greenResult, verdict: "FALSE" }));
});

test("a freshly built receipt verifies", () => {
  const receipt = buildReceipt(greenResult);
  assert.equal(verifyReceipt(receipt), true);
});

test("tampering with the receipt breaks the signature", () => {
  const receipt = buildReceipt(greenResult);
  const tampered = { ...receipt, verdict: "FALSE" as const };
  assert.equal(verifyReceipt(tampered), false);
});

test("signature is deterministic for the same payload", () => {
  const { signature, ...payload } = buildReceipt(greenResult);
  assert.equal(signReceipt(payload), signature);
});

test("multi-CTA receipt lists every CTA and only signs when all TRUE", () => {
  const second: GateResult = {
    ...greenResult,
    ctaId: "demo",
    cta: "Book a demo",
    sessionId: "test-session-2",
  };
  const receipt = buildReceipt([greenResult, second]);
  assert.equal(receipt.ctas.length, 2);
  assert.deepEqual(
    receipt.ctas.map((c) => c.cta),
    ["Sign up", "Book a demo"],
  );
  assert.equal(verifyReceipt(receipt), true);
});

test("refuses a multi-CTA receipt if any CTA is red", () => {
  const red: GateResult = { ...greenResult, ctaId: "demo", verdict: "FALSE" };
  assert.throws(() => buildReceipt([greenResult, red]));
});

test("refuses a multi-CTA receipt spanning multiple pages", () => {
  const other: GateResult = { ...greenResult, pageId: "other" };
  assert.throws(() => buildReceipt([greenResult, other]));
});

test("normaliseReceipt lifts a legacy single-CTA receipt into ctas[]", () => {
  const legacy: Receipt = {
    pageId: "waitlist",
    verdict: "TRUE",
    ctas: [] as any, // legacy on disk didn't have this field at all
    verifiedAt: "2026-08-20T15:04:07.756Z",
    signature: "deadbeef",
    cta: "Sign up",
    checks: [{ step: 1, action: "click", status: "pass" }],
    kaneSessionId: "legacy-session",
    videoTrace: null,
  };
  const upgraded = normaliseReceipt(legacy);
  assert.equal(upgraded.ctas.length, 1);
  assert.equal(upgraded.ctas[0].cta, "Sign up");
  assert.equal(upgraded.ctas[0].kaneSessionId, "legacy-session");
});
