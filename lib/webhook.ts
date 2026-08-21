/**
 * Publish webhook — POSTs a signed JSON payload to PUBLISH_WEBHOOK_URL every
 * time a page goes green. Slack- and Discord-compatible (both accept an
 * incoming-webhook POST with a `text` field), and any generic HTTP endpoint
 * gets the structured fields too.
 *
 * No-op when PUBLISH_WEBHOOK_URL is unset — so it stays silent in dev and only
 * fires where an operator explicitly wired it.
 */
import crypto from "node:crypto";

export type PublishWebhookPayload = {
  event: "latch.published";
  pageId: string;
  receiptId: string;
  receiptUrl: string;
  liveUrl: string;
  verifiedAt: string;
  ctas: string[];
};

export type WebhookResult =
  | { sent: false; reason: "no-url" }
  | { sent: true; status: number };

function slackText(p: PublishWebhookPayload): string {
  const ctas = p.ctas.length === 1 ? `“${p.ctas[0]}”` : `${p.ctas.length} CTAs`;
  return (
    `✅ *Latch published \`${p.pageId}\`* — ${ctas} proven working in a real browser.\n` +
    `Receipt: ${p.receiptUrl}\nLive: ${p.liveUrl}`
  );
}

/**
 * Fire the webhook. Never throws — a broken webhook must not fail the publish.
 * Returns a structured result so callers can log or assert on it.
 */
export async function notifyPublish(
  payload: PublishWebhookPayload,
  opts: { url?: string; secret?: string; fetchImpl?: typeof fetch } = {},
): Promise<WebhookResult> {
  const url = opts.url ?? process.env.PUBLISH_WEBHOOK_URL;
  if (!url) return { sent: false, reason: "no-url" };

  const secret = opts.secret ?? process.env.PUBLISH_WEBHOOK_SECRET;
  const body = JSON.stringify({ ...payload, text: slackText(payload) });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) {
    headers["x-latch-signature"] =
      "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(url, { method: "POST", headers, body });
    return { sent: true, status: res.status };
  } catch {
    // Silent failure is intentional — the publish already happened on-chain-of-truth
    // (in the receipt file); a webhook outage must not roll it back.
    return { sent: true, status: 0 };
  }
}
