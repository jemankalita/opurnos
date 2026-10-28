import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { comparePay, monthlyInr } from "./pay";
import type { MatchStatus, OpportunityType, Verdict } from "./schemas";

export type RadarFilters = { type?: OpportunityType | "all"; verdict?: Verdict | "all"; includeIneligible?: boolean };

const matchColumns = {
  opportunityId: schema.matches.opportunityId,
  verdict: schema.matches.verdict,
  score: schema.matches.score,
  why: schema.matches.why,
  status: schema.matches.status,
  feedback: schema.matches.feedback,
  judgedBy: schema.matches.judgedBy,
  createdAt: schema.matches.createdAt,
  title: schema.opportunities.title,
  org: schema.opportunities.org,
  orgLogo: schema.opportunities.orgLogo,
  type: schema.opportunities.type,
  deadline: schema.opportunities.deadline,
  locations: schema.opportunities.locations,
  remote: schema.opportunities.remote,
  comp: schema.opportunities.comp,
  ats: schema.opportunities.ats,
  sourceId: schema.opportunities.sourceId,
};

export async function getRadar(userId: string, f: RadarFilters = {}) {
  const db = await getDb();
  const where = [
    eq(schema.matches.userId, userId),
    eq(schema.opportunities.isActive, true),
    inArray(schema.matches.status, ["new", "saved"] as MatchStatus[]),
  ];
  if (!f.includeIneligible) where.push(ne(schema.matches.verdict, "ineligible"));
  if (f.type && f.type !== "all") where.push(eq(schema.opportunities.type, f.type));
  if (f.verdict && f.verdict !== "all") where.push(eq(schema.matches.verdict, f.verdict));
  return db
    .select(matchColumns)
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(and(...where))
    .orderBy(desc(schema.matches.score))
    .limit(200);
}
export type RadarItem = Awaited<ReturnType<typeof getRadar>>[number];

export async function getOpportunityForUser(userId: string, opportunityId: string) {
  const db = await getDb();
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) return null;
  const [match] = await db
    .select()
    .from(schema.matches)
    .where(and(eq(schema.matches.userId, userId), eq(schema.matches.opportunityId, opportunityId)));
  const [application] = await db
    .select({ id: schema.applications.id, state: schema.applications.state })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.opportunityId, opportunityId)))
    .orderBy(desc(schema.applications.createdAt))
    .limit(1);
  return { opp, match: match ?? null, application: application ?? null };
}

const PAY_SAMPLE_LIMIT = 3000;

/** This listing's pay against other open listings of the same type that state rupee pay. */
export async function getPayComparison(opp: { id: string; type: OpportunityType; comp: string | null }) {
  if (monthlyInr(opp.comp) === null) return null;
  const db = await getDb();
  const rows = await db
    .select({ comp: schema.opportunities.comp })
    .from(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.isActive, true),
        eq(schema.opportunities.type, opp.type),
        ne(schema.opportunities.id, opp.id),
        sql`${schema.opportunities.comp} is not null`,
      ),
    )
    .limit(PAY_SAMPLE_LIMIT);
  return comparePay(opp.comp, rows.map((r) => r.comp));
}

export async function getPipeline(userId: string) {
  const db = await getDb();
  return db
    .select(matchColumns)
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(
      and(eq(schema.matches.userId, userId), inArray(schema.matches.status, ["saved", "applying", "submitted", "interview", "rejected", "offer"])),
    )
    .orderBy(desc(schema.matches.updatedAt));
}

export async function getPublicStats() {
  const db = await getDb();
  const rows = await db
    .select({ type: schema.opportunities.type, count: sql<number>`count(*)` })
    .from(schema.opportunities)
    .where(eq(schema.opportunities.isActive, true))
    .groupBy(schema.opportunities.type);
  const [sources] = await db.select({ count: sql<number>`count(*)` }).from(schema.sources).where(eq(schema.sources.status, "ok"));
  const byType = Object.fromEntries(rows.map((r) => [r.type, Number(r.count)])) as Record<string, number>;
  return { total: rows.reduce((s, r) => s + Number(r.count), 0), byType, sources: Number(sources?.count ?? 0) };
}

export async function getSources() {
  const db = await getDb();
  return db.select().from(schema.sources).orderBy(schema.sources.kind, schema.sources.label);
}

export async function getUsage(userId: string) {
  const db = await getDb();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select({
      kind: schema.agentRuns.kind,
      model: schema.agentRuns.model,
      calls: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${schema.agentRuns.costUsd}), 0)`,
      tokens: sql<number>`coalesce(sum(${schema.agentRuns.tokensIn} + ${schema.agentRuns.tokensOut}), 0)`,
      failures: sql<number>`sum(case when ${schema.agentRuns.ok} then 0 else 1 end)`,
    })
    .from(schema.agentRuns)
    .where(and(eq(schema.agentRuns.userId, userId), gte(schema.agentRuns.createdAt, since)))
    .groupBy(schema.agentRuns.kind, schema.agentRuns.model);
  return rows.map((r) => ({ ...r, calls: Number(r.calls), cost: Number(r.cost), tokens: Number(r.tokens), failures: Number(r.failures) }));
}

export async function getRadarCounts(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ verdict: schema.matches.verdict, count: sql<number>`count(*)` })
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(and(eq(schema.matches.userId, userId), eq(schema.opportunities.isActive, true), inArray(schema.matches.status, ["new", "saved"])))
    .groupBy(schema.matches.verdict);
  return Object.fromEntries(rows.map((r) => [r.verdict, Number(r.count)])) as Partial<Record<Verdict, number>>;
}

/** A handful of real, live listings for the public landing radar, spread across every type. */
/** Public landing sample: for each type, the open listings that close soonest (rolling ones last). */
export async function getLandingSample(perType = 3) {
  const db = await getDb();
  const o = schema.opportunities;
  const ranked = db
    .select({
      id: o.id,
      title: o.title,
      org: o.org,
      type: o.type,
      deadline: o.deadline,
      remote: o.remote,
      rn: sql<number>`row_number() over (partition by ${o.type} order by ${o.deadline} asc nulls last, ${o.firstSeen} desc)`.as("rn"),
    })
    .from(o)
    .where(and(eq(o.isActive, true), sql`(${o.deadline} is null or ${o.deadline} > now())`))
    .as("ranked");
  return db
    .select({ id: ranked.id, title: ranked.title, org: ranked.org, type: ranked.type, deadline: ranked.deadline, remote: ranked.remote })
    .from(ranked)
    .where(sql`${ranked.rn} <= ${perType}`)
    .orderBy(ranked.type, ranked.rn);
}
