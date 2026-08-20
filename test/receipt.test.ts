import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReceipt, signReceipt, verifyReceipt } from "../lib/receipt";
import type { GateResult } from "../lib/types";

const greenResult: GateResult = {
  pageId: "waitlist",
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
  assert.equal(receipt.kaneSessionId, "test-session");
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
