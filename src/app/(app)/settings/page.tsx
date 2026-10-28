import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { spentToday } from "@/lib/ai/client";
import { env, isDemoMode } from "@/lib/env";
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
  const [sources, usage, spent] = await Promise.all([getSources(), getUsage(userId), spentToday(userId)]);
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
        budget={{ spent, cap: env.DAILY_LLM_BUDGET_USD, applyCap: env.DAILY_APPLY_CAP }}
        usage={usage}
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
