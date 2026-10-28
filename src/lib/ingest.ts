import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { allConnectors, type Connector, type RawOpportunity } from "./connectors";
import { websiteConnector } from "./connectors/website";
import { getDb, schema } from "./db";
import { extractRulesHeuristic } from "./ai/heuristics";
import type { ScoutLead } from "./ai/agents";
import { contentHash, sha1 } from "./text";
import { mapLimit } from "./concurrency";
import { pageWatchConnector } from "./page-watch";

const BATCH = 150;

export type SourceResult = { id: string; label: string; count: number; ok: boolean; error?: string; ms: number };

function toRow(sourceId: string, o: RawOpportunity, now: Date) {
  return {
    sourceId,
    externalId: o.externalId,
    url: o.url,
    applyUrl: o.applyUrl,
    ats: o.ats,
    type: o.type,
    title: o.title.slice(0, 300),
    org: o.org.slice(0, 200),
    orgLogo: o.orgLogo ?? null,
    locations: o.locations.slice(0, 12),
    remote: o.remote,
    deadline: o.deadline,
    startsAt: o.startsAt ?? null,
    postedAt: o.postedAt ?? null,
    comp: o.comp ?? null,
    tags: o.tags.slice(0, 12),
    description: o.description,
    // Structured sources ship rules; everyone else gets a cheap heuristic until the LLM pass.
    rules: o.rules ?? extractRulesHeuristic(o.description),
    rulesExtracted: Boolean(o.rules),
    contentHash: contentHash(o.org, o.title, o.locations[0] ?? ""),
    isActive: !o.deadline || o.deadline >= now,
    lastSeen: now,
  };
}

export async function upsertOpportunities(sourceId: string, items: RawOpportunity[], now = new Date()) {
  const db = await getDb();
  // Same external id twice in one payload would make a single INSERT ... ON CONFLICT fail.
  const unique = [...new Map(items.map((i) => [i.externalId, i])).values()];
  for (let i = 0; i < unique.length; i += BATCH) {
    const rows = unique.slice(i, i + BATCH).map((o) => toRow(sourceId, o, now));
    await db
      .insert(schema.opportunities)
      .values(rows)
      .onConflictDoUpdate({
        target: [schema.opportunities.sourceId, schema.opportunities.externalId],
        set: {
          url: sql`excluded.url`,
          applyUrl: sql`excluded.apply_url`,
          title: sql`excluded.title`,
          org: sql`excluded.org`,
          orgLogo: sql`excluded.org_logo`,
          locations: sql`excluded.locations`,
          remote: sql`excluded.remote`,
          deadline: sql`excluded.deadline`,
          comp: sql`excluded.comp`,
          tags: sql`excluded.tags`,
          description: sql`excluded.description`,
          // Keep LLM-extracted rules unless the source itself now provides structured ones.
          rules: sql`case when ${schema.opportunities.rulesExtracted} and not excluded.rules_extracted then ${schema.opportunities.rules} else excluded.rules end`,
          rulesExtracted: sql`${schema.opportunities.rulesExtracted} or excluded.rules_extracted`,
          contentHash: sql`excluded.content_hash`,
          isActive: sql`excluded.is_active`,
          lastSeen: sql`excluded.last_seen`,
        },
      });
  }
  // Anything this source stopped listing is no longer open.
  await db
    .update(schema.opportunities)
    .set({ isActive: false })
    .where(and(eq(schema.opportunities.sourceId, sourceId), lt(schema.opportunities.lastSeen, now)));
  return unique.length;
}

export async function runConnector(c: Connector): Promise<SourceResult> {
  const db = await getDb();
  const started = Date.now();
  await db
    .insert(schema.sources)
    .values({ id: c.id, kind: c.kind, label: c.label, status: "running" })
    .onConflictDoUpdate({ target: schema.sources.id, set: { status: "running", label: c.label } });
  try {
    const items = await c.fetch();
    const count = await upsertOpportunities(c.id, items);
    await db
      .update(schema.sources)
      .set({ status: "ok", lastRunAt: new Date(), lastCount: count, lastError: null })
      .where(eq(schema.sources.id, c.id));
    return { id: c.id, label: c.label, count, ok: true, ms: Date.now() - started };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] ${c.id} failed:`, error);
    await db
      .update(schema.sources)
      .set({ status: "error", lastRunAt: new Date(), lastError: error.slice(0, 500) })
      .where(eq(schema.sources.id, c.id));
    return { id: c.id, label: c.label, count: 0, ok: false, error, ms: Date.now() - started };
  }
}

/** Runs every connector (bounded concurrency). A failing source never blocks the others. */
export async function runIngest(filter?: (c: Connector) => boolean): Promise<SourceResult[]> {
  const connectors = [...allConnectors(), pageWatchConnector(), ...(await websiteConnectors())].filter(filter ?? (() => true));
  const results = await mapLimit(connectors, 4, runConnector);
  await expireClosed();
  return results;
}

/** Websites people asked us to watch (Settings → Watch a website). */
async function websiteConnectors(): Promise<Connector[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.sources).where(and(eq(schema.sources.kind, "website"), isNotNull(schema.sources.url)));
  return rows.map((s) => websiteConnector({ id: s.id, url: s.url!, label: s.label }));
}

/** Takes a source's listings off the radar, e.g. when its website is removed. */
export async function deactivateSource(sourceId: string) {
  const db = await getDb();
  await db.update(schema.opportunities).set({ isActive: false }).where(eq(schema.opportunities.sourceId, sourceId));
}

export async function expireClosed(now = new Date()) {
  const db = await getDb();
  await db
    .update(schema.opportunities)
    .set({ isActive: false })
    .where(and(isNotNull(schema.opportunities.deadline), lt(schema.opportunities.deadline, now)));
}

/** Web Scout leads become first-class opportunities (source "web"). */
export async function upsertScoutLeads(leads: ScoutLead[]) {
  if (leads.length === 0) return 0;
  const db = await getDb();
  const now = new Date();
  const rows = leads.map((l) =>
    toRow(
      "web:scout",
      {
        externalId: sha1(l.url),
        url: l.url,
        applyUrl: l.url,
        ats: "other",
        type: l.type,
        title: l.title,
        org: l.org,
        locations: [],
        remote: false,
        deadline: l.deadline,
        tags: ["Found by Web Scout"],
        description: l.summary,
      },
      now,
    ),
  );
  await db
    .insert(schema.opportunities)
    .values(rows)
    .onConflictDoUpdate({
      target: [schema.opportunities.sourceId, schema.opportunities.externalId],
      set: { lastSeen: sql`excluded.last_seen`, deadline: sql`excluded.deadline`, isActive: sql`excluded.is_active` },
    });
  await db
    .insert(schema.sources)
    .values({ id: "web:scout", kind: "web", label: "Web Scout (live search)", status: "ok", lastRunAt: now, lastCount: rows.length })
    .onConflictDoUpdate({ target: schema.sources.id, set: { status: "ok", lastRunAt: now, lastCount: rows.length } });
  return rows.length;
}
