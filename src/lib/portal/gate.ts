import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { authSecret, env } from "../env";

// The count lives on the server: a counter in the browser would reset on every refresh.

export const MAX_TRIES = 3;
export const LOCK_MINUTES = 30;

export type AttemptResult =
  | { status: "ok" }
  | { status: "wrong"; triesLeft: number }
  | { status: "locked"; retryAt: string }
  | { status: "unconfigured" };

export type GateState = { status: "open"; triesLeft: number } | { status: "locked"; retryAt: string };

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Case-insensitive, so a phone's auto-capitalised "Barnali" doesn't burn one of three tries. */
export function passcodeMatches(input: string, expected: string): boolean {
  return timingSafeEqual(digest(input.trim().toUpperCase()), digest(expected.trim().toUpperCase()));
}

/**
 * The visitor's address as seen by our own proxy. Vercel sets x-real-ip. Otherwise we take the
 * last x-forwarded-for entry, the one our proxy appended: the first entry is whatever the client
 * sent, so trusting it would let a guesser get fresh tries by changing the header.
 */
export function clientAddress(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? "local";
}

/** Identifies a visitor without storing their IP address. */
export function visitorKey(headers: Headers): string {
  return digest(`${authSecret()}:${clientAddress(headers)}`).toString("hex");
}

export async function gateState(visitor: string, now = new Date()): Promise<GateState> {
  const db = await getDb();
  const [row] = await db.select().from(schema.portalAttempts).where(eq(schema.portalAttempts.visitor, visitor));
  if (!row) return { status: "open", triesLeft: MAX_TRIES };
  if (row.lockedUntil && row.lockedUntil > now) return { status: "locked", retryAt: row.lockedUntil.toISOString() };
  if (row.lockedUntil) return { status: "open", triesLeft: MAX_TRIES };
  return { status: "open", triesLeft: MAX_TRIES - row.failures };
}

async function clearAttempts(visitor: string) {
  const db = await getDb();
  await db.delete(schema.portalAttempts).where(eq(schema.portalAttempts.visitor, visitor));
}

/** Atomic, so parallel guesses can't all read the same count and slip past the limit. */
async function recordFailure(visitor: string, now: Date): Promise<AttemptResult> {
  const db = await getDb();
  const [row] = await db
    .insert(schema.portalAttempts)
    .values({ visitor, failures: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.portalAttempts.visitor,
      set: { failures: sql`${schema.portalAttempts.failures} + 1`, updatedAt: now },
    })
    .returning();
  if (row.failures < MAX_TRIES) return { status: "wrong", triesLeft: MAX_TRIES - row.failures };
  const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);
  await db.update(schema.portalAttempts).set({ lockedUntil }).where(eq(schema.portalAttempts.visitor, visitor));
  return { status: "locked", retryAt: lockedUntil.toISOString() };
}

const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Deletes rows for visitors who are not locked and haven't tried for a day, so the table stays small. */
export async function pruneAttempts(now = new Date()): Promise<number> {
  const db = await getDb();
  const t = schema.portalAttempts;
  const cutoff = new Date(now.getTime() - PRUNE_AFTER_MS);
  const removed = await db
    .delete(t)
    .where(and(lt(t.updatedAt, cutoff), or(isNull(t.lockedUntil), lt(t.lockedUntil, now))))
    .returning({ visitor: t.visitor });
  return removed.length;
}

export async function attemptPasscode(visitor: string, input: string, now = new Date(), expected = env.PORTAL_PASSCODE): Promise<AttemptResult> {
  if (!expected) return { status: "unconfigured" };
  const db = await getDb();
  const [row] = await db.select().from(schema.portalAttempts).where(eq(schema.portalAttempts.visitor, visitor));
  if (row?.lockedUntil) {
    if (row.lockedUntil > now) return { status: "locked", retryAt: row.lockedUntil.toISOString() };
    await clearAttempts(visitor);
  }
  if (!passcodeMatches(input, expected)) return recordFailure(visitor, now);
  await clearAttempts(visitor);
  return { status: "ok" };
}
