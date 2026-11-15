import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { signToken, verifyToken } from "./tokens";

export const SESSION_COOKIE = "opurnos_session";
const SESSION_TTL = 60 * 60 * 24 * 30;
// Refresh "last seen" at most this often, so reading a session isn't a write on every request.
const LAST_SEEN_EVERY_MS = 60 * 60 * 1000;
const MAX_USER_AGENT = 300;

export type Session = { userId: string; email: string; sessionId: string };

/**
 * The signed-in user, or null. The cookie is a signed token naming a row in `sessions`;
 * the row must exist, be unexpired and not revoked, so signing out anywhere takes effect at once.
 * Cached per request, so a page and its layout share one lookup.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, "session");
  if (!payload?.email || typeof payload.sid !== "string") return null;

  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, payload.sid), eq(schema.sessions.userId, payload.sub), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, now)));
  if (!row) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > LAST_SEEN_EVERY_MS) {
    await db.update(schema.sessions).set({ lastSeenAt: now }).where(eq(schema.sessions.id, row.id));
  }
  return { userId: payload.sub, email: payload.email, sessionId: row.id };
});

/** For pages: redirects to /login when signed out. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** For route handlers: throws a 401 HttpError when signed out. */
export async function requireApiUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in to continue.");
  return session;
}

export async function createSession(userId: string, email: string): Promise<string> {
  const db = await getDb();
  const userAgent = (await headers()).get("user-agent")?.slice(0, MAX_USER_AGENT) ?? null;
  const [row] = await db
    .insert(schema.sessions)
    .values({ userId, userAgent, expiresAt: new Date(Date.now() + SESSION_TTL * 1000) })
    .returning({ id: schema.sessions.id });
  const token = await signToken({ sub: userId, email, sid: row.id }, "session", SESSION_TTL);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https://"),
    path: "/",
    maxAge: SESSION_TTL,
  });
  return row.id;
}

/** Signs out this device: revokes its session row and clears the cookie. */
export async function destroySession() {
  const session = await getSession();
  if (session) await revokeSession(session.userId, session.sessionId);
  (await cookies()).delete(SESSION_COOKIE);
}

export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const db = await getDb();
  const revoked = await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)))
    .returning({ id: schema.sessions.id });
  return revoked.length === 1;
}

/** Signs out every device except `keepSessionId` (pass null to sign out everywhere). */
export async function revokeOtherSessions(userId: string, keepSessionId: string | null): Promise<number> {
  const db = await getDb();
  const conditions = [eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)];
  if (keepSessionId) conditions.push(ne(schema.sessions.id, keepSessionId));
  const revoked = await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: schema.sessions.id });
  return revoked.length;
}

export type SessionInfo = { id: string; userAgent: string | null; createdAt: string; lastSeenAt: string; isCurrent: boolean };

export async function listSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, new Date())))
    .orderBy(desc(schema.sessions.lastSeenAt));
  return rows.map((r) => ({
    id: r.id,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    isCurrent: r.id === currentSessionId,
  }));
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  return user ?? null;
}

export async function markEmailVerified(userId: string) {
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.emailVerifiedAt)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export async function findOrCreateUser(email: string) {
  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return existing;
  const [created] = await db.insert(schema.users).values({ email }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(schema.users).where(eq(schema.users.email, email)))[0];
}
