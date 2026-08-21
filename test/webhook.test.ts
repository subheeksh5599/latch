import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { notifyPublish } from "../lib/webhook";

const payload = {
  event: "latch.published" as const,
  pageId: "waitlist",
  receiptId: "waitlist-abc12345",
  receiptUrl: "https://latch.example/api/receipt/waitlist-abc12345",
  liveUrl: "https://latch.example/p/waitlist",
  verifiedAt: "2026-08-20T15:04:07.756Z",
  ctas: ["Sign up"],
};

test("no-ops silently when PUBLISH_WEBHOOK_URL is unset", async () => {
  const prev = process.env.PUBLISH_WEBHOOK_URL;
  delete process.env.PUBLISH_WEBHOOK_URL;
  try {
    const result = await notifyPublish(payload);
    assert.equal(result.sent, false);
  } finally {
    if (prev) process.env.PUBLISH_WEBHOOK_URL = prev;
  }
});

test("POSTs a JSON body with a slack-compatible text field", async () => {
  let capturedUrl: string | null = null;
  let capturedBody: string | null = null;
  const fakeFetch = async (url: string, init?: any) => {
    capturedUrl = url;
    capturedBody = String(init?.body ?? "");
    return { status: 200 } as any;
  };
  const result = await notifyPublish(payload, {
    url: "https://hooks.example/AAA",
    fetchImpl: fakeFetch as any,
  });
  assert.deepEqual(result, { sent: true, status: 200 });
  assert.equal(capturedUrl, "https://hooks.example/AAA");
  const body = JSON.parse(capturedBody!);
  assert.equal(body.event, "latch.published");
  assert.equal(body.pageId, "waitlist");
  assert.ok(body.text.includes("Latch published"), "has slack text field");
  assert.ok(body.text.includes("waitlist-abc12345"));
});

test("attaches a valid HMAC-SHA256 signature header when a secret is provided", async () => {
  let capturedHeaders: Record<string, string> | null = null;
  let capturedBody: string | null = null;
  const fakeFetch = async (_url: string, init?: any) => {
    capturedHeaders = init?.headers as Record<string, string>;
    capturedBody = String(init?.body ?? "");
    return { status: 204 } as any;
  };
  await notifyPublish(payload, {
    url: "https://hooks.example/AAA",
    secret: "shhh",
    fetchImpl: fakeFetch as any,
  });
  const sig = capturedHeaders!["x-latch-signature"];
  assert.ok(sig?.startsWith("sha256="), "signature header present");
  const expected =
    "sha256=" + crypto.createHmac("sha256", "shhh").update(capturedBody!).digest("hex");
  assert.equal(sig, expected);
});

test("swallows fetch errors so a broken webhook cannot break publish", async () => {
  const boom = async () => {
    throw new Error("connection refused");
  };
  const result = await notifyPublish(payload, {
    url: "https://hooks.example/AAA",
    fetchImpl: boom as any,
  });
  assert.equal(result.sent, true);
  assert.equal((result as any).status, 0);
});
