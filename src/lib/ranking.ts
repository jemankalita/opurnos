import { tokenize } from "./text";
import type { Profile, Preferences, Verdict } from "./schemas";

export const WEIGHTS = {
  fit: 0.35,
  eligibility: 0.25,
  urgency: 0.15,
  value: 0.15,
  preference: 0.1,
} as const;

const ELIGIBILITY_SCORE: Record<Verdict, number> = {
  eligible: 1,
  likely: 0.7,
  stretch: 0.35,
  ineligible: 0,
};

// Role words appear in nearly every listing, so they say nothing about fit.
const GENERIC = new Set(
  "intern interns internship internships engineer engineers engineering developer developers development software student students junior senior lead assistant associate trainee fellow program programme year years experience skills".split(" "),
);

/** Keywords that describe what the person is good at and wants. Order: strongest first. */
export function profileKeywords(profile: Profile, prefs: Preferences): string[] {
  const phrases = [
    ...prefs.roles,
    ...profile.skills,
    ...profile.interests,
    ...profile.experience.map((e) => e.title),
    ...profile.projects.flatMap((p) => p.tech),
    ...profile.education.map((e) => e.field ?? ""),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of phrases.flatMap((p) => tokenize(p))) {
    if (!seen.has(t) && !GENERIC.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.slice(0, 80);
}

/**
 * Cheap lexical fit in [0,1]: weighted share of profile keywords present in the listing,
 * with title hits counted double. Used for triage before any model call.
 */
export function keywordFit(keywords: string[], title: string, body: string): number {
  if (keywords.length === 0) return 0.3;
  const titleTokens = new Set(tokenize(title));
  const bodyTokens = new Set(tokenize(body.slice(0, 6000)));
  let score = 0;
  let max = 0;
  keywords.forEach((k, i) => {
    const w = 1 / (1 + i * 0.05); // earlier keywords matter more
    max += w;
    if (titleTokens.has(k)) score += w * 2;
    else if (bodyTokens.has(k)) score += w;
  });
  // Normalise so that matching ~25% of weighted keywords already reads as a strong fit.
  return Math.min(1, score / (max * 0.25));
}

/** 1.0 when the deadline is within a week, fading to 0.2 at 90+ days; 0 if closed. Rolling = 0.4. */
export function urgency(deadline: Date | null, now = new Date()): number {
  if (!deadline) return 0.4;
  const days = (deadline.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return 0;
  if (days <= 7) return 1;
  if (days >= 90) return 0.2;
  return 1 - ((days - 7) / 83) * 0.8;
}

export type FeedbackStats = { byType: Record<string, number>; byOrg: Record<string, number> };

/** Learned preference in [0,1] from save/dismiss history (0.5 = neutral). */
export function preference(stats: FeedbackStats, type: string, org: string): number {
  const t = stats.byType[type] ?? 0;
  const o = stats.byOrg[org.toLowerCase()] ?? 0;
  const raw = 0.5 + Math.tanh(t / 4) * 0.3 + Math.tanh(o / 2) * 0.2;
  return Math.max(0, Math.min(1, raw));
}

export function scoreMatch(input: {
  fit: number;
  verdict: Verdict;
  deadline: Date | null;
  value: number;
  preference: number;
  now?: Date;
}): { score: number; breakdown: Record<keyof typeof WEIGHTS, number> } {
  const breakdown = {
    fit: clamp(input.fit),
    eligibility: ELIGIBILITY_SCORE[input.verdict],
    urgency: urgency(input.deadline, input.now),
    value: clamp(input.value),
    preference: clamp(input.preference),
  };
  const total = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((sum, k) => sum + WEIGHTS[k] * breakdown[k], 0);
  // A closed or ineligible opportunity never ranks high, whatever the other signals say.
  const capped = input.verdict === "ineligible" || breakdown.urgency === 0 ? Math.min(total, 0.25) : total;
  return { score: Math.round(capped * 100), breakdown };
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
