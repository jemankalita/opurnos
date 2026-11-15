import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { mapLimit } from "../concurrency";
import type { WatchedPage } from "../connectors/watched-pages";
import { getDb, schema } from "../db";
import { checkPage } from "../page-watch";
import type { WatchStatus } from "./tracker-view";
import type { Program } from "./types";

// Two live feeds for the tracker: official program pages checked for changes, and new listings
// from the sources the radar already ingests. Dates in the tracker itself only change by hand,
// because a page changing is a reason to look, not proof of a new date.

const WATCH_PREFIX = "portal:";
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const CONCURRENT_CHECKS = 3;
const LIVE_LISTING_LIMIT = 30;
// Matched in Postgres, so this is POSIX syntax: \y is a word boundary.
const EARLY_YEARS_TITLE =
  "\\y(freshman|freshmen|sophomores?|first[- ]year|second[- ]year|1st[- ]year|2nd[- ]year|underclass\\w*|spring (week|insight|intern\\w*)|insight (week|day|program\\w*)|discovery (day|program\\w*|intern\\w*))\\y";

const watchId = (programId: string) => `${WATCH_PREFIX}${programId}`;

function toWatchedPage(program: Program): WatchedPage {
  return {
    id: watchId(program.id),
    url: program.url,
    title: program.name,
    org: program.org,
    type: "internship",
    locations: [program.location],
    tags: [],
    about: program.summary,
  };
}

export const watchedPrograms = (programs: Program[]) => programs.filter((p) => p.watch);

/** Checks every watched official page. One site being down never stops the others. */
export async function refreshWatches(programs: Program[], now = new Date()) {
  const pages = watchedPrograms(programs).map(toWatchedPage);
  const results = await mapLimit(pages, CONCURRENT_CHECKS, (page) => checkPage(page, now));
  return { checked: results.length, failed: results.filter((r) => r.error).length };
}

export async function loadWatchStatus(programs: Program[]): Promise<Map<string, WatchStatus>> {
  const ids = watchedPrograms(programs).map((p) => watchId(p.id));
  if (ids.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.select().from(schema.pageWatches).where(inArray(schema.pageWatches.id, ids));
  return new Map(
    rows.map((row) => [
      row.id.slice(WATCH_PREFIX.length),
      {
        checkedAt: row.checkedAt?.toISOString() ?? null,
        changedAt: row.changedAt?.toISOString() ?? null,
        added: row.added,
        lastError: row.lastError,
      },
    ]),
  );
}

/** True when a watched page has never been checked, or the newest check is too old. */
export function isStale(statuses: WatchStatus[], expected: number, now = new Date()): boolean {
  if (expected === 0) return false;
  if (statuses.length < expected) return true;
  const newest = Math.max(...statuses.map((s) => (s.checkedAt ? Date.parse(s.checkedAt) : 0)));
  return now.getTime() - newest > STALE_AFTER_MS;
}

export type LiveListing = { id: string; title: string; org: string; url: string; deadline: string | null; firstSeen: string };

export async function loadLiveListings(): Promise<LiveListing[]> {
  const db = await getDb();
  const o = schema.opportunities;
  const rows = await db
    .select({ id: o.id, title: o.title, org: o.org, url: o.url, deadline: o.deadline, firstSeen: o.firstSeen })
    .from(o)
    .where(and(eq(o.isActive, true), sql`${o.title} ~* ${EARLY_YEARS_TITLE}`))
    .orderBy(desc(o.firstSeen))
    .limit(LIVE_LISTING_LIMIT);
  return rows.map((r) => ({ ...r, deadline: r.deadline?.toISOString() ?? null, firstSeen: r.firstSeen.toISOString() }));
}
