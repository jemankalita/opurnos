import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { extractRules, judge, scout } from "./ai/agents";
import { BudgetExceededError } from "./ai/client";
import { checkRules, isStudent, reconcileVerdict } from "./eligibility";
import { upsertScoutLeads } from "./ingest";
import { keywordFit, preference, profileKeywords, scoreMatch, urgency, type FeedbackStats } from "./ranking";
import { tokenize } from "./text";
import { mapLimit } from "./concurrency";
import { getPlan, planLimits } from "./plans";
import { SENIOR_RE } from "./connectors/types";
import { isFresherFriendly } from "./experience";
import { CYBERCRIME_HELP, scamSignals } from "./scam";
import type { OpportunityType, Preferences, Profile } from "./schemas";

const TRIAGE_KEEP = 150;
const FRESHER_BOOST = 0.1;
const DEFAULT_JUDGE_LIMIT = 40;

export type MatchRunResult = {
  candidates: number;
  triaged: number;
  judged: number;
  rescored: number;
  scouted: number;
  budgetHit: boolean;
};

async function feedbackStats(userId: string): Promise<FeedbackStats> {
  const db = await getDb();
  const rows = await db
    .select({ type: schema.opportunities.type, org: schema.opportunities.org, status: schema.matches.status, feedback: schema.matches.feedback })
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(eq(schema.matches.userId, userId));
  const stats: FeedbackStats = { byType: {}, byOrg: {} };
  for (const r of rows) {
    const signal =
      (r.feedback ?? 0) +
      (["saved", "applying", "submitted", "interview", "offer"].includes(r.status) ? 1 : 0) -
      (r.status === "dismissed" ? 1 : 0);
    if (!signal) continue;
    stats.byType[r.type] = (stats.byType[r.type] ?? 0) + signal;
    const org = r.org.toLowerCase();
    stats.byOrg[org] = (stats.byOrg[org] ?? 0) + signal;
  }
  return stats;
}

function locationBoost(prefs: Preferences, locations: string[], remote: boolean): number {
  if (prefs.locations.length === 0) return 0;
  if (remote && prefs.remoteOk) return 0.1;
  const joined = locations.join(" ").toLowerCase();
  return prefs.locations.some((l) => joined.includes(l.toLowerCase())) ? 0.15 : -0.1;
}

/**
 * The matching pipeline for one user:
 *  triage (free: SQL + keywords) → lazy rule extraction (once per listing, shared)
 *  → hard-rule check → LLM judge (only survivors) → transparent score.
 */
export async function runMatching(
  userId: string,
  opts: { judgeLimit?: number; withScout?: boolean; now?: Date } = {},
): Promise<MatchRunResult> {
  const now = opts.now ?? new Date();
  const db = await getDb();
  const [profileRow] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const profile = profileRow?.parsed as Profile | null;
  if (!profileRow || !profile) throw new Error("Upload a resume first.");
  const prefs = profileRow.prefs;
  const result: MatchRunResult = { candidates: 0, triaged: 0, judged: 0, rescored: 0, scouted: 0, budgetHit: false };

  const limits = planLimits(await getPlan(userId, now));

  if (opts.withScout && limits.webScout) {
    try {
      result.scouted = await upsertScoutLeads(await scout({ userId, profile, prefs }));
    } catch (err) {
      if (err instanceof BudgetExceededError) result.budgetHit = true;
      else console.error("[match] scout failed:", err instanceof Error ? err.message : err);
    }
  }

  const keywords = profileKeywords(profile, prefs);
  const student = isStudent(profile, now) !== false;
  const stats = await feedbackStats(userId);

  const candidates = await db
    .select({
      id: schema.opportunities.id,
      title: schema.opportunities.title,
      org: schema.opportunities.org,
      type: schema.opportunities.type,
      description: schema.opportunities.description,
      locations: schema.opportunities.locations,
      remote: schema.opportunities.remote,
      deadline: schema.opportunities.deadline,
      comp: schema.opportunities.comp,
      tags: schema.opportunities.tags,
      rules: schema.opportunities.rules,
      rulesExtracted: schema.opportunities.rulesExtracted,
      contentHash: schema.opportunities.contentHash,
    })
    .from(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.isActive, true),
        inArray(schema.opportunities.type, prefs.types as OpportunityType[]),
        or(isNull(schema.opportunities.deadline), gte(schema.opportunities.deadline, now)),
      ),
    );
  result.candidates = candidates.length;

  // ---- Triage: free signals only ----
  const seenHashes = new Set<string>();
  const triaged = candidates
    .filter((c) => !(student && c.type === "job" && SENIOR_RE.test(c.title)))
    .map((c) => {
      // Students see roles that really take freshers ahead of ones that quietly want experience.
      const fresher = student && (c.type === "job" || c.type === "internship") && isFresherFriendly(`${c.title}\n${c.description}`) ? FRESHER_BOOST : 0;
      const fit = Math.max(0, Math.min(1, keywordFit(keywords, `${c.title} ${c.tags.join(" ")}`, c.description) + locationBoost(prefs, c.locations, c.remote) + fresher));
      return { ...c, fit, rank: fit * 0.75 + urgency(c.deadline, now) * 0.25 };
    })
    .sort((a, b) => b.rank - a.rank)
    .filter((c) => (seenHashes.has(c.contentHash) ? false : (seenHashes.add(c.contentHash), true)))
    .slice(0, TRIAGE_KEEP);
  result.triaged = triaged.length;

  const existing = await db
    .select({ opportunityId: schema.matches.opportunityId, verdict: schema.matches.verdict, breakdown: schema.matches.breakdown })
    .from(schema.matches)
    .where(eq(schema.matches.userId, userId));
  const existingById = new Map(existing.map((e) => [e.opportunityId, e]));

  // ---- Re-score already-judged matches (deadlines move, preferences learn) ----
  for (const e of existing) {
    const c = candidates.find((x) => x.id === e.opportunityId);
    if (!c) continue;
    const { score, breakdown } = scoreMatch({
      fit: e.breakdown.fit ?? 0.5,
      verdict: e.verdict,
      deadline: c.deadline,
      value: e.breakdown.value ?? 0.5,
      preference: preference(stats, c.type, c.org),
      now,
    });
    await db
      .update(schema.matches)
      .set({ score, breakdown, updatedAt: now })
      .where(and(eq(schema.matches.userId, userId), eq(schema.matches.opportunityId, e.opportunityId)));
    result.rescored++;
  }

  // ---- Judge new candidates ----
  const fresh = triaged.filter((c) => !existingById.has(c.id)).slice(0, opts.judgeLimit ?? DEFAULT_JUDGE_LIMIT);
  const keywordSet = new Set(keywords);

  await mapLimit(fresh, 4, async (c) => {
    if (result.budgetHit) return;
    try {
      let rules = c.rules;
      if (!c.rulesExtracted) {
        const extracted = await extractRules(c);
        rules = extracted.value;
        if (extracted.by !== "rules") {
          await db.update(schema.opportunities).set({ rules, rulesExtracted: true }).where(eq(schema.opportunities.id, c.id));
        }
      }
      const rulesCheck = checkRules(profile, prefs, rules!, c.deadline, now, c.title);
      const matchedKeywords = [...new Set(tokenize(`${c.title} ${c.description}`))].filter((t) => keywordSet.has(t));
      const feeQuotes = scamSignals(`${c.title}\n${c.description}`, c.type);
      // A listing that asks applicants for money is a likely scam; never recommend it.
      const judgement = feeQuotes.length
        ? {
            value: {
              verdict: "ineligible" as const,
              fit: c.fit,
              value: 0,
              why: `Possible scam: this listing asks applicants for money. Genuine employers don't charge fees. ${CYBERCRIME_HELP}`,
              evidence: [
                { requirement: "Doesn't ask applicants for money", status: "unmet" as const, listingQuote: feeQuotes[0], profileFact: null },
                ...rulesCheck.evidence,
              ],
              gaps: [],
            },
            by: "rules",
          }
        : // Clear disqualifiers don't need a model call.
          rulesCheck.verdict === "ineligible"
          ? {
              value: {
                verdict: "ineligible" as const,
                fit: c.fit,
                value: 0.5,
                why: `You don't meet: ${rulesCheck.evidence.filter((e) => e.status === "unmet").map((e) => e.requirement).join("; ")}.`,
                evidence: rulesCheck.evidence,
                gaps: rulesCheck.evidence.filter((e) => e.status === "unmet").map((e) => e.requirement),
              },
              by: "rules",
            }
          : await judge({
              userId,
              profile,
              prefs,
              opp: { ...c, type: c.type },
              rulesCheck,
              fit: c.fit,
              matchedKeywords,
              useModel: limits.aiJudging,
            });
      const j = judgement.value;
      const verdict = reconcileVerdict(j.verdict, rulesCheck);
      // Blend the model's fit with the lexical fit so one noisy signal can't dominate.
      const fit = judgement.by === "rules" ? c.fit : j.fit * 0.7 + c.fit * 0.3;
      const { score, breakdown } = scoreMatch({ fit, verdict, deadline: c.deadline, value: j.value, preference: preference(stats, c.type, c.org), now });
      await db
        .insert(schema.matches)
        .values({
          userId,
          opportunityId: c.id,
          verdict,
          score,
          breakdown,
          why: j.why,
          evidence: j.evidence.length ? j.evidence : rulesCheck.evidence,
          gaps: j.gaps,
          judgedBy: judgement.by,
        })
        .onConflictDoNothing();
      result.judged++;
    } catch (err) {
      if (err instanceof BudgetExceededError) result.budgetHit = true;
      else console.error(`[match] ${c.id} failed:`, err instanceof Error ? err.message : err);
    }
  });

  await db.update(schema.profiles).set({ lastMatchedAt: now }).where(eq(schema.profiles.userId, userId));
  return result;
}

export async function usersDueForMatching(olderThanHours = 12) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  return db
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(and(eq(schema.profiles.onboarded, true), or(isNull(schema.profiles.lastMatchedAt), sql`${schema.profiles.lastMatchedAt} < ${cutoff}`)));
}
