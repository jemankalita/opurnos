import { applyWebhookEvent, verifyWebhookSignature } from "@/lib/billing/razorpay";
import { env } from "@/lib/env";
import { fail, handle, ok } from "@/lib/http";

const MAX_BODY = 256 * 1024;

/** Razorpay webhook. The signature covers the raw body, so it's checked before parsing. */
export const POST = handle(async (req: Request) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return fail(503, "Webhooks aren't configured.");
  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail(413, "Payload too large.");
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) return fail(401, "Invalid signature.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid JSON.");
  }
  return ok({ outcome: await applyWebhookEvent(body) });
});
