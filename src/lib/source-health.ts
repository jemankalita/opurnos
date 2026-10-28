export type SourceHealth = "ok" | "stale" | "empty" | "error" | "running" | "never";

type SourceLike = { status: string; lastCount: number; lastRunAt: Date | string | null };

/** Ingest runs every 6 h (daily on Vercel Hobby), so a source unseen for 30 h has stopped being checked. */
export const STALE_AFTER_HOURS = 30;

/**
 * A scraper rarely fails loudly. Besides hard errors, flag sources that returned
 * nothing (a layout change usually looks like an empty result) or that stopped running.
 */
export function sourceHealth(s: SourceLike, now = new Date()): SourceHealth {
  if (s.status === "running") return "running";
  if (s.status === "error") return "error";
  if (!s.lastRunAt) return "never";
  const ageHours = (now.getTime() - new Date(s.lastRunAt).getTime()) / 3_600_000;
  if (ageHours > STALE_AFTER_HOURS) return "stale";
  if (s.lastCount === 0) return "empty";
  return "ok";
}

