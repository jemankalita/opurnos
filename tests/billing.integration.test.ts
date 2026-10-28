/**
 * Plans and Razorpay billing against embedded Postgres, with Razorpay's API stubbed.
 * Signatures are computed here with node:crypto, the way Razorpay computes them.
 */
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-billing-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.MODEL_API_KEY = "";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
process.env.RAZORPAY_PRO_PLAN_ID = "plan_pro";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

const billing = await import("@/lib/billing/razorpay");
const plans = await import("@/lib/plans");
const { HttpError } = await import("@/lib/auth");
const { getDb, schema } = await import("@/lib/db");

const hmac = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex");
const DAY = 86_400_000;
const NOW = new Date("2026-10-29T12:00:00Z");

async function newUser(email: string) {
  const db = await getDb();
  const [user] = await db.insert(schema.users).values({ email }).returning();
  return user.id;
}

function stubRazorpay(reply: Record<string, unknown>) {
  const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") });
    return new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
  });
  return calls;
}

const webhook = (event: string, entity: Record<string, unknown>) => ({ event, payload: { subscription: { entity } } });

beforeAll(async () => {
  await getDb();
}, 120_000);

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe("planFromSubscription", () => {
  it.each([
    [null, "free"],
    [{ status: "created", currentPeriodEnd: null }, "free"],
    [{ status: "authenticated", currentPeriodEnd: null }, "pro"],
    [{ status: "active", currentPeriodEnd: new Date(NOW.getTime() + DAY) }, "pro"],
    [{ status: "pending", currentPeriodEnd: new Date(NOW.getTime() - DAY) }, "pro"],
    [{ status: "cancelled", currentPeriodEnd: new Date(NOW.getTime() + DAY) }, "pro"],
    [{ status: "cancelled", currentPeriodEnd: new Date(NOW.getTime() - DAY) }, "free"],
    [{ status: "halted", currentPeriodEnd: null }, "free"],
    [{ status: "expired", currentPeriodEnd: new Date(NOW.getTime() + DAY) }, "free"],
  ] as const)("%j → %s", (sub, plan) => {
    expect(plans.planFromSubscription(sub, NOW)).toBe(plan);
  });

  it("gives Free no AI features and Pro all of them", () => {
    expect(plans.planLimits("free")).toMatchObject({ aiJudging: false, applyAgent: false, aiReferrals: false, webScout: false, dailyApplications: 0 });
    expect(plans.planLimits("pro")).toMatchObject({ aiJudging: true, applyAgent: true, aiReferrals: true, webScout: true });
    expect(plans.planLimits("pro").dailyAiUsd).toBeGreaterThan(plans.planLimits("free").dailyAiUsd);
  });
});

describe("signatures", () => {
  it("accepts Checkout's payment signature only for our subscription id", () => {
    const sig = hmac("pay_1|sub_1", "key-secret");
    expect(billing.verifyPaymentSignature("pay_1", "sub_1", sig, "key-secret")).toBe(true);
    expect(billing.verifyPaymentSignature("pay_1", "sub_2", sig, "key-secret")).toBe(false);
    expect(billing.verifyPaymentSignature("pay_1", "sub_1", sig, "other-secret")).toBe(false);
  });

  it("checks the webhook signature over the raw body", () => {
    const raw = JSON.stringify(webhook("subscription.activated", { id: "sub_x", status: "active" }));
    const sig = hmac(raw, "webhook-secret");
    expect(billing.verifyWebhookSignature(raw, sig, "webhook-secret")).toBe(true);
    expect(billing.verifyWebhookSignature(`${raw} `, sig, "webhook-secret")).toBe(false);
    expect(billing.verifyWebhookSignature(raw, "not-hex", "webhook-secret")).toBe(false);
    expect(billing.verifyWebhookSignature(raw, "", "webhook-secret")).toBe(false);
  });
});

describe("subscription lifecycle", () => {
  it("subscribes, confirms Checkout, follows webhooks and cancels at cycle end", async () => {
    const userId = await newUser("pro@example.com");
    expect(await plans.getPlan(userId, NOW)).toBe("free");
    await expect(plans.requireFeature(userId, "applyAgent")).rejects.toMatchObject({ status: 402 });

    const calls = stubRazorpay({ id: "sub_A", status: "created" });
    expect(await billing.createSubscription(userId)).toEqual({ subscriptionId: "sub_A", keyId: "rzp_test_key" });
    expect(calls[0].url).toBe("https://api.razorpay.com/v1/subscriptions");
    expect(calls[0].body).toMatchObject({ plan_id: "plan_pro", total_count: 120, notes: { userId } });
    expect(calls[0].auth).toBe(`Basic ${Buffer.from("rzp_test_key:key-secret").toString("base64")}`);
    expect(await plans.getPlan(userId, NOW)).toBe("free");

    // A forged Checkout response is rejected; the real one unlocks Pro straight away.
    await expect(billing.confirmCheckout(userId, "pay_1", hmac("pay_1|sub_OTHER", "key-secret"))).rejects.toBeInstanceOf(HttpError);
    await billing.confirmCheckout(userId, "pay_1", hmac("pay_1|sub_A", "key-secret"));
    expect(await plans.getPlan(userId, NOW)).toBe("pro");
    await expect(billing.createSubscription(userId)).rejects.toMatchObject({ status: 409 });

    const periodEnd = Math.floor((NOW.getTime() + 30 * DAY) / 1000);
    expect(await billing.applyWebhookEvent(webhook("subscription.charged", { id: "sub_A", status: "active", current_end: periodEnd }))).toBe("updated");
    expect(await plans.getSubscription(userId)).toMatchObject({ status: "active", currentPeriodEnd: new Date(periodEnd * 1000) });

    const cancel = stubRazorpay({ id: "sub_A", status: "active", current_end: periodEnd });
    await billing.cancelSubscription(userId);
    expect(cancel[0].url).toBe("https://api.razorpay.com/v1/subscriptions/sub_A/cancel");
    expect(cancel[0].body).toEqual({ cancel_at_cycle_end: true });
    expect(await plans.getSubscription(userId)).toMatchObject({ cancelAtCycleEnd: true });

    // At the end of the cycle Razorpay cancels it; Pro lasts exactly until the paid period ends.
    await billing.applyWebhookEvent(webhook("subscription.cancelled", { id: "sub_A", status: "cancelled", current_end: periodEnd }));
    expect(await plans.getPlan(userId, new Date(periodEnd * 1000 - 1000))).toBe("pro");
    expect(await plans.getPlan(userId, new Date(periodEnd * 1000 + 1000))).toBe("free");
  });

  it("cancels immediately when the account is being deleted", async () => {
    const userId = await newUser("leaving@example.com");
    stubRazorpay({ id: "sub_B", status: "created" });
    await billing.createSubscription(userId);
    await billing.applyWebhookEvent(webhook("subscription.activated", { id: "sub_B", status: "active", current_end: 2_000_000_000 }));
    const calls = stubRazorpay({ id: "sub_B", status: "cancelled", current_end: 2_000_000_000 });
    await billing.cancelBeforeDeletion(userId);
    expect(calls[0].body).toEqual({ cancel_at_cycle_end: false });
  });
});

describe("webhooks", () => {
  it("creates the row from the userId note when the webhook beats our insert", async () => {
    const userId = await newUser("race@example.com");
    const outcome = await billing.applyWebhookEvent(webhook("subscription.authenticated", { id: "sub_C", status: "authenticated", notes: { userId } }));
    expect(outcome).toBe("created");
    expect(await plans.getPlan(userId, NOW)).toBe("pro");
  });

  it("never lets an event about an old, replaced subscription overwrite the current one", async () => {
    const userId = await newUser("replaced@example.com");
    stubRazorpay({ id: "sub_NEW", status: "created" });
    await billing.createSubscription(userId);
    const outcome = await billing.applyWebhookEvent(webhook("subscription.cancelled", { id: "sub_OLD", status: "cancelled", notes: { userId } }));
    expect(outcome).toBe("ignored");
    expect(await plans.getSubscription(userId)).toMatchObject({ razorpaySubscriptionId: "sub_NEW", status: "created" });
  });

  it("ignores payment events, malformed bodies and unknown users", async () => {
    expect(await billing.applyWebhookEvent({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } })).toBe("ignored");
    expect(await billing.applyWebhookEvent({ nope: true })).toBe("ignored");
    expect(await billing.applyWebhookEvent(webhook("subscription.activated", { id: "sub_D", status: "active", notes: { userId: "ghost" } }))).toBe("ignored");
    expect(await billing.applyWebhookEvent(webhook("subscription.activated", { id: "sub_E", status: "active", notes: [] }))).toBe("ignored");
  });
});
