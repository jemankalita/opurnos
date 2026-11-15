import type { Program } from "./types";

// Status is worked out from today's date on every load, so nothing goes stale between data updates.
// Only dates a program has published can read "Open". Anything projected says so.

export type TrackerState = "open" | "opening" | "likely-open" | "expected" | "rolling" | "paused" | "unknown";

export type Timing = {
  state: TrackerState;
  label: string;
  isProjected: boolean;
  daysLeft: number | null;
  /** The day that matters next, as YYYY-MM-DD, for sorting. Null when no date is known. */
  sortDay: string | null;
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
// A published close older than this belongs to an earlier cycle, so it says nothing about the current one.
const SAME_CYCLE_DAYS = 240;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today's date in India, as YYYY-MM-DD. */
export const istDay = (now: Date) => new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

const isInWindow = (month: number, from: number, to: number) => (from <= to ? month >= from && month <= to : month >= from || month <= to);

const windowLabel = (from: number, to: number, year: number) =>
  from === to ? `Expected ${MONTHS[from - 1]} ${year}` : `Expected ${MONTHS[from - 1]}–${MONTHS[to - 1]} ${year}`;

const firstOfMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-01`;

function publishedTiming(published: NonNullable<Program["published"]>, today: string): Timing | null {
  const { opens, closes } = published;
  if (opens && opens > today) {
    return { state: "opening", label: `Opens ${formatDay(opens)}`, isProjected: false, daysLeft: daysBetween(today, opens), sortDay: opens };
  }
  if (closes && closes >= today) {
    return { state: "open", label: `Open until ${formatDay(closes)}`, isProjected: false, daysLeft: daysBetween(today, closes), sortDay: closes };
  }
  return null;
}

function expectedTiming(expected: NonNullable<Program["expected"]>, today: string, cycleClosed: boolean): Timing {
  const { from, to } = expected;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const inWindow = isInWindow(month, from, to);

  if (inWindow && !cycleClosed) {
    return { state: "likely-open", label: "Likely open now, not confirmed", isProjected: true, daysLeft: null, sortDay: today };
  }
  const nextYear = month < from ? year : year + 1;
  return { state: "expected", label: windowLabel(from, to, nextYear), isProjected: true, daysLeft: null, sortDay: firstOfMonth(nextYear, from) };
}

export function programTiming(program: Program, now = new Date()): Timing {
  const none = { isProjected: false, daysLeft: null, sortDay: null };
  if (program.availability === "paused") return { ...none, state: "paused", label: "Not running" };

  const today = istDay(now);
  const fromPublished = program.published ? publishedTiming(program.published, today) : null;
  if (fromPublished) return fromPublished;
  if (program.rolling) return { ...none, state: "rolling", label: "Rolling, apply any time" };

  const closes = program.published?.closes;
  const cycleClosed = Boolean(closes && daysBetween(closes, today) <= SAME_CYCLE_DAYS);
  if (program.expected) return expectedTiming(program.expected, today, cycleClosed);
  return { ...none, state: "unknown", label: "Dates not known yet" };
}
