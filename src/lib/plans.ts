import { eq } from "drizzle-orm";
import { HttpError } from "./auth";
import { getDb, schema } from "./db";
import { env, isBillingEnabled } from "./env";

// Free: the radar, rule-based eligibility evidence, digests, calendar sync, scam warnings and
// pay comparisons. Pro: the AI on top (judging, tailoring, the apply agent, referral drafts,
// live web search) with a larger daily AI allowance.

export type PlanId = "free" | "pro";

export type PlanLimits = {
  dailyAiUsd: number;
  aiJudging: boolean;
  applyAgent: boolean;
  aiReferrals: boolean;
  webScout: boolean;
  watchedSites: number;
  dailyApplications: number;
};

export function planLimits(plan: PlanId): PlanLimits {
  return plan === "pro"
    ? {
        dailyAiUsd: env.PRO_DAILY_AI_USD,
        aiJudging: true,
        applyAgent: true,
        aiReferrals: true,
        webScout: true,
        watchedSites: 10,
        dailyApplications: env.PRO_DAILY_APPLY_CAP,
      }
    : { dailyAiUsd: env.FREE_DAILY_AI_USD, aiJudging: false, applyAgent: false, aiReferrals: false, webScout: false, watchedSites: 2, dailyApplications: 0 };
}

// "pending" means Razorpay is retrying a failed charge; access continues while it does.
const PAID_STATUSES = new Set(["authenticated", "active", "pending"]);
// Cancelled (at cycle end), halted or completed plans keep Pro until the paid period ends.
const ENDED_STATUSES = new Set(["cancelled", "halted", "completed"]);

export type SubscriptionState = { status: string; currentPeriodEnd: Date | null };

export function planFromSubscription(sub: SubscriptionState | null | undefined, now = new Date()): PlanId {
  if (!sub) return "free";
  if (PAID_STATUSES.has(sub.status)) return "pro";
  if (ENDED_STATUSES.has(sub.status) && sub.currentPeriodEnd && sub.currentPeriodEnd > now) return "pro";
  return "free";
}

export async function getSubscription(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  return row ?? null;
}

/** Without Razorpay keys (local development, self-hosting) every account gets Pro features. */
export async function getPlan(userId: string, now = new Date()): Promise<PlanId> {
  if (!isBillingEnabled) return "pro";
  return planFromSubscription(await getSubscription(userId), now);
}

const FEATURE_LABEL: Record<"applyAgent" | "aiReferrals" | "webScout", string> = {
  applyAgent: "Tailored applications and the apply agent",
  aiReferrals: "AI-written referral requests",
  webScout: "Live web search for long-tail opportunities",
};

/** Throws 402 with an upgrade message when the user's plan doesn't include the feature. */
export async function requireFeature(userId: string, feature: keyof typeof FEATURE_LABEL): Promise<PlanLimits> {
  const limits = planLimits(await getPlan(userId));
  if (!limits[feature]) throw new HttpError(402, `${FEATURE_LABEL[feature]} are part of Opurnos Pro. Upgrade on the Pricing page to use them.`);
  return limits;
}
