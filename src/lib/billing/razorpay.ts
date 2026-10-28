import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError } from "../auth";
import { getDb, schema } from "../db";
import { env, isBillingEnabled } from "../env";

// Razorpay Subscriptions: the server creates a subscription, Checkout collects the mandate,
// and webhooks keep our copy of its status current. Webhooks are the source of truth; the
// Checkout callback only gives the user instant access while the first webhook is in flight.

const API = "https://api.razorpay.com/v1";
// Monthly billing for up to ten years; the user cancels whenever they like.
const TOTAL_COUNT = 120;
const LIVE_STATUSES = new Set(["authenticated", "active", "pending"]);

function requireBilling() {
  if (!isBillingEnabled) throw new HttpError(503, "Billing isn't set up on this server.");
}

async function razorpay<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
  if (!res.ok) {
    console.error(`[billing] Razorpay ${path} failed: HTTP ${res.status}`, json.error?.description);
    throw new HttpError(502, "The payment provider didn't accept the request. Please try again in a minute.");
  }
  return json as T;
}

/** Constant-time comparison of a hex HMAC-SHA256 against the signature Razorpay sent. */
function hmacMatches(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Checkout's signature for a subscription payment: HMAC(payment_id + "|" + subscription_id). */
export function verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string, secret: string): boolean {
  return hmacMatches(`${paymentId}|${subscriptionId}`, signature, secret);
}

/** Webhook signature: HMAC of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  return hmacMatches(rawBody, signature, secret);
}

type RazorpaySubscription = { id: string; status: string; current_end?: number | null };

export async function createSubscription(userId: string): Promise<{ subscriptionId: string; keyId: string }> {
  requireBilling();
  const db = await getDb();
  const [existing] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  if (existing && LIVE_STATUSES.has(existing.status) && !existing.cancelAtCycleEnd) {
    throw new HttpError(409, "You're already on Pro.");
  }
  const sub = await razorpay<RazorpaySubscription>("/subscriptions", {
    plan_id: env.RAZORPAY_PRO_PLAN_ID,
    total_count: TOTAL_COUNT,
    customer_notify: true,
    notes: { userId },
  });
  // One row per user: a new subscription replaces an abandoned or ended one.
  const values = {
    razorpaySubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: existing?.currentPeriodEnd ?? null,
    cancelAtCycleEnd: false,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.subscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: schema.subscriptions.userId, set: values });
  return { subscriptionId: sub.id, keyId: env.RAZORPAY_KEY_ID! };
}

/** Called with Checkout's handler response. Checks it against the subscription we created. */
export async function confirmCheckout(userId: string, paymentId: string, signature: string): Promise<void> {
  requireBilling();
  const db = await getDb();
  const [row] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  if (!row) throw new HttpError(404, "No checkout in progress.");
  if (!verifyPaymentSignature(paymentId, row.razorpaySubscriptionId, signature, env.RAZORPAY_KEY_SECRET!)) {
    throw new HttpError(400, "We couldn't verify that payment. If you were charged, contact support and we'll sort it out.");
  }
  if (row.status === "created") {
    await db
      .update(schema.subscriptions)
      .set({ status: "authenticated", updatedAt: new Date() })
      .where(eq(schema.subscriptions.userId, userId));
  }
}

/**
 * Cancels at the end of the paid period, so the user keeps Pro for what they paid for.
 * `immediately` is for account deletion, where nothing may renew afterwards.
 */
export async function cancelSubscription(userId: string, immediately = false): Promise<{ status: string; periodEnd: Date | null }> {
  requireBilling();
  const db = await getDb();
  const [row] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  if (!row || !LIVE_STATUSES.has(row.status)) throw new HttpError(404, "There's no active subscription to cancel.");
  // Razorpay only allows end-of-cycle cancellation once a cycle has been charged.
  const atCycleEnd = !immediately && row.status === "active";
  const sub = await razorpay<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(row.razorpaySubscriptionId)}/cancel`, {
    cancel_at_cycle_end: atCycleEnd,
  });
  const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : row.currentPeriodEnd;
  await db
    .update(schema.subscriptions)
    .set({ status: sub.status, cancelAtCycleEnd: atCycleEnd, currentPeriodEnd: periodEnd, updatedAt: new Date() })
    .where(eq(schema.subscriptions.userId, userId));
  return { status: sub.status, periodEnd };
}

const WebhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z.object({
            id: z.string(),
            status: z.string(),
            current_end: z.number().nullish(),
            notes: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).nullish(),
          }),
        })
        .optional(),
    })
    .default({}),
});

export type WebhookOutcome = "updated" | "created" | "ignored";

/** Applies a verified webhook body. Unknown events and subscriptions we can't tie to a user are ignored. */
export async function applyWebhookEvent(body: unknown): Promise<WebhookOutcome> {
  const parsed = WebhookSchema.safeParse(body);
  const entity = parsed.success ? parsed.data.payload.subscription?.entity : undefined;
  if (!parsed.success || !parsed.data.event.startsWith("subscription.") || !entity) return "ignored";

  const db = await getDb();
  const periodEnd = entity.current_end ? new Date(entity.current_end * 1000) : null;
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.razorpaySubscriptionId, entity.id));
  if (row) {
    await db
      .update(schema.subscriptions)
      .set({ status: entity.status, currentPeriodEnd: periodEnd ?? row.currentPeriodEnd, updatedAt: new Date() })
      .where(eq(schema.subscriptions.razorpaySubscriptionId, entity.id));
    return "updated";
  }

  // The row can be missing if our insert raced the webhook; the userId note ties it back.
  const notes = entity.notes && !Array.isArray(entity.notes) ? entity.notes : {};
  const userId = typeof notes.userId === "string" ? notes.userId : null;
  if (!userId) return "ignored";
  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId));
  if (!user) return "ignored";
  // If the user already has a row it belongs to a newer subscription; an event about an older,
  // replaced one must not overwrite it.
  const inserted = await db
    .insert(schema.subscriptions)
    .values({ userId, razorpaySubscriptionId: entity.id, status: entity.status, currentPeriodEnd: periodEnd })
    .onConflictDoNothing()
    .returning({ userId: schema.subscriptions.userId });
  return inserted.length ? "created" : "ignored";
}

/** Before an account is deleted: stop any live subscription so nothing is charged afterwards. */
export async function cancelBeforeDeletion(userId: string): Promise<void> {
  if (!isBillingEnabled) return;
  const db = await getDb();
  const [row] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  if (!row || !LIVE_STATUSES.has(row.status)) return;
  await cancelSubscription(userId, true);
}
