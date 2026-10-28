import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { spentToday } from "@/lib/ai/client";
import { calendarFeedUrl } from "@/lib/calendar";
import { env, isBillingEnabled, isDemoMode } from "@/lib/env";
import { getPlan, getSubscription, planLimits } from "@/lib/plans";
import { getProfileRow } from "@/lib/profile";
import { getSources, getUsage } from "@/lib/queries";
import { DEFAULT_PREFERENCES } from "@/lib/schemas";
import { sourceHealth } from "@/lib/source-health";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId, email } = await requireUser();
  const profile = await getProfileRow(userId);
  if (!profile?.onboarded) redirect("/start");
  const [sources, usage, spent, feedUrl, plan, subscription] = await Promise.all([
    getSources(),
    getUsage(userId),
    spentToday(userId),
    calendarFeedUrl(userId),
    getPlan(userId),
    getSubscription(userId),
  ]);
  const limits = planLimits(plan);
  return (
    <div>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Settings</p>
        <h1 className="mt-1 font-display text-[34px] leading-[0.95] uppercase sm:text-[44px]">Tune your radar</h1>
      </header>
      <SettingsClient
        email={email}
        prefs={profile.prefs ?? DEFAULT_PREFERENCES}
        resumeName={profile.resumeFileName}
        lastDigestAt={profile.lastDigestAt?.toISOString() ?? null}
        demo={isDemoMode}
        budget={{ spent, cap: limits.dailyAiUsd, applyCap: limits.dailyApplications }}
        billing={{
          enabled: isBillingEnabled,
          plan,
          priceInr: env.PRO_PRICE_INR,
          status: subscription?.status ?? null,
          periodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
          cancelAtCycleEnd: subscription?.cancelAtCycleEnd ?? false,
        }}
        usage={usage}
        calendarFeedUrl={feedUrl}
        sources={sources.map(({ addedBy, ...s }) => ({
          ...s,
          health: sourceHealth(s),
          lastRunAt: s.lastRunAt?.toISOString() ?? null,
          // Who added a website stays private; the client only learns whether it was you.
          mine: addedBy === userId,
        }))}
      />
    </div>
  );
}
