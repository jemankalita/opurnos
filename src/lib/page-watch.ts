import { and, eq, inArray } from "drizzle-orm";
import type { Connector, RawOpportunity } from "./connectors";
import { WATCHED_PAGES, type WatchedPage } from "./connectors/watched-pages";
import { mapLimit } from "./concurrency";
import { getDb, schema } from "./db";
import { isAllowedByRobots, safeFetch } from "./safe-fetch";
import { htmlToText, sha1 } from "./text";

// "Opens soon" watch. Seasonal programs post their dates only when a cycle opens, so we keep
// each official page's date and application lines and flag the listing when they change.

export const PAGE_WATCH_SOURCE = "watch:pages";
const SIGNAL = /\b(20[2-3]\d|apply|applications?|deadline|last date|registrations?|register|opens?|opened|clos(e|es|ed|ing)|batch|eligib\w*|notification|announce\w*)\b/i;
// Lines that change on every visit or are site chrome, not program news.
const NOISE = /©|copyright|all rights reserved|cookie|privacy policy|last updated|visitors?:|opens in a new tab/i;
const MAX_LINES = 80;
const SHOWN_LINES = 6;
const RECENT_DAYS = 14;

/** Date and application lines, in page order, deduplicated. */
export function signalLines(html: string): string[] {
  // htmlToText only breaks on paragraph-like tags; menus and table cells would run into the next line.
  const blocks = html.replace(/<\/(nav|header|footer|main|article|aside|table|td|th|dt|dd|h[1-6])>/gi, "$&\n");
  const lines = htmlToText(blocks)
    .split(/\n|(?<=[.!?])\s+/)
    .map((l) => l.replace(/\s+/g, " ").trim().replace(/^[•\-–*]\s*/, ""))
    .filter((l) => l.length >= 15 && l.length <= 300 && l.split(" ").length >= 4 && SIGNAL.test(l) && !NOISE.test(l));
  return [...new Set(lines)].slice(0, MAX_LINES);
}

export const linesHash = (lines: string[]) => sha1(lines.join("\n"));

type WatchState = { lines: string[]; added: string[]; changedAt: Date | null };

export function toListing(page: WatchedPage, state: WatchState | null, now = new Date()): RawOpportunity {
  const changed = state?.changedAt ?? null;
  const recent = changed !== null && now.getTime() - changed.getTime() < RECENT_DAYS * 86_400_000;
  const status = changed
    ? `The official page changed on ${changed.toISOString().slice(0, 10)}. New on the page:\n${state!.added.slice(0, SHOWN_LINES).map((l) => `• ${l}`).join("\n")}`
    : "No new dates yet. Opurnos checks the official page every day and flags this listing when its dates or application details change.";
  const current = state?.lines.length ? `\n\nFrom the official page:\n${state.lines.slice(0, SHOWN_LINES).map((l) => `• ${l}`).join("\n")}` : "";
  return {
    externalId: page.id,
    url: page.url,
    applyUrl: page.url,
    ats: "pagewatch",
    type: page.type,
    title: page.title,
    org: page.org,
    locations: page.locations,
    remote: false,
    deadline: null,
    postedAt: changed,
    tags: [...page.tags, recent ? "Page updated" : "Watching for dates"],
    description: `${page.about}\n\n${status}${current}`,
  };
}

async function fetchLines(page: WatchedPage): Promise<string[]> {
  if (!(await isAllowedByRobots(page.url))) throw new Error("robots.txt disallows this page");
  const res = await safeFetch(page.url);
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  const lines = signalLines(res.body);
  // An empty result is a layout change or a block page, not "no news"; don't overwrite the baseline.
  if (lines.length === 0) throw new Error("No date or application lines found on the page");
  // A focused page may legitimately have no matching lines yet (no round announced).
  return page.focus ? lines.filter((l) => page.focus!.test(l)) : lines;
}

/** Re-opens a changed program in the digest for everyone it matched, with what changed as the reason. */
async function notifyChange(page: WatchedPage, added: string[], now: Date) {
  const db = await getDb();
  const [opp] = await db
    .select({ id: schema.opportunities.id })
    .from(schema.opportunities)
    .where(and(eq(schema.opportunities.sourceId, PAGE_WATCH_SOURCE), eq(schema.opportunities.externalId, page.id)));
  if (!opp) return;
  const first = added[0] ? `: "${added[0].slice(0, 160)}"` : ".";
  await db
    .update(schema.matches)
    .set({ emailedAt: null, why: `The official ${page.title} page changed on ${now.toISOString().slice(0, 10)}${first}`, updatedAt: now })
    .where(and(eq(schema.matches.opportunityId, opp.id), inArray(schema.matches.status, ["new", "saved"])));
}

type CheckResult = { state: WatchState | null; error?: string };

async function checkPage(page: WatchedPage, now: Date): Promise<CheckResult> {
  const db = await getDb();
  const [row] = await db.select().from(schema.pageWatches).where(eq(schema.pageWatches.id, page.id));
  let lines: string[];
  try {
    lines = await fetchLines(page);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db
      .insert(schema.pageWatches)
      .values({ id: page.id, url: page.url, checkedAt: now, lastError: error })
      .onConflictDoUpdate({ target: schema.pageWatches.id, set: { checkedAt: now, lastError: error } });
    return { state: row ? { lines: row.lines, added: row.added, changedAt: row.changedAt } : null, error };
  }
  const hash = linesHash(lines);
  if (!row?.hash) {
    // First successful check is the baseline, not a change.
    await db
      .insert(schema.pageWatches)
      .values({ id: page.id, url: page.url, hash, lines, checkedAt: now, lastError: null })
      .onConflictDoUpdate({ target: schema.pageWatches.id, set: { hash, lines, checkedAt: now, lastError: null } });
    return { state: { lines, added: [], changedAt: null } };
  }
  if (row.hash === hash) {
    await db.update(schema.pageWatches).set({ checkedAt: now, lastError: null }).where(eq(schema.pageWatches.id, page.id));
    return { state: { lines, added: row.added, changedAt: row.changedAt } };
  }
  const before = new Set(row.lines);
  const added = lines.filter((l) => !before.has(l));
  await db.update(schema.pageWatches).set({ hash, lines, added, checkedAt: now, changedAt: now, lastError: null }).where(eq(schema.pageWatches.id, page.id));
  await notifyChange(page, added, now);
  return { state: { lines, added, changedAt: now } };
}

/** Runs as an ordinary source so it shows up in source health and its listings are upserted. */
export function pageWatchConnector(pages: WatchedPage[] = WATCHED_PAGES): Connector {
  return {
    id: PAGE_WATCH_SOURCE,
    kind: "pagewatch",
    label: "Official pages (opens-soon watch)",
    fetch: async () => {
      const now = new Date();
      const results = await mapLimit(pages, 3, (p) => checkPage(p, now));
      // One page failing is normal (a site is down); all of them failing means we can't watch at all.
      if (results.every((r) => r.error)) throw new Error(`Every watched page failed, e.g. ${pages[0]?.url}: ${results[0]?.error}`);
      return pages.map((p, i) => toListing(p, results[i].state, now));
    },
  };
}
