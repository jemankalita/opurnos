import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { HttpError } from "./auth";

export type Limit = { max: number; windowMs: number };

// Named limits for the auth endpoints. Keys combine the action with an email or an address hash.
export const LIMITS = {
  login: { max: 10, windowMs: 15 * 60_000 },
  signup: { max: 5, windowMs: 60 * 60_000 },
  emailLink: { max: 1, windowMs: 30_000 },
  emailPerAddress: { max: 10, windowMs: 60 * 60_000 },
  passwordReset: { max: 3, windowMs: 60 * 60_000 },
} satisfies Record<string, Limit>;

export type LimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Counts one hit against `key` and says whether it's within the limit. Atomic in Postgres, so
 * parallel requests can't all slip through, and it works across server instances.
 */
export async function hit(key: string, { max, windowMs }: Limit, now = new Date()): Promise<LimitResult> {
  const db = await getDb();
  const t = schema.rateLimits;
  const windowOpen = new Date(now.getTime() - windowMs);
  const [row] = await db
    .insert(t)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`case when ${t.windowStart} <= ${windowOpen} then 1 else ${t.count} + 1 end`,
        windowStart: sql`case when ${t.windowStart} <= ${windowOpen} then ${now} else ${t.windowStart} end`,
      },
    })
    .returning();
  const resetAt = row.windowStart.getTime() + windowMs;
  return { allowed: row.count <= max, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
}

function waitMessage(seconds: number): string {
  if (seconds < 90) return `Too many tries. Wait ${seconds} seconds and try again.`;
  return `Too many tries. Wait about ${Math.ceil(seconds / 60)} minutes and try again.`;
}

/** Throws a 429 when any of the keys is over its limit. Every key is counted, even after one fails. */
export async function enforce(checks: [key: string, limit: Limit][], now = new Date()): Promise<void> {
  const results = await Promise.all(checks.map(([key, limit]) => hit(key, limit, now)));
  const blocked = results.filter((r) => !r.allowed);
  if (blocked.length > 0) throw new HttpError(429, waitMessage(Math.max(...blocked.map((r) => r.retryAfterSeconds))));
}

/** Deletes counters whose window ended long ago, so the table stays small. */
export async function pruneRateLimits(now = new Date(), olderThanMs = 24 * 60 * 60_000): Promise<void> {
  const db = await getDb();
  await db.delete(schema.rateLimits).where(sql`${schema.rateLimits.windowStart} < ${new Date(now.getTime() - olderThanMs)}`);
}
