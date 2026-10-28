import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { signToken, verifyToken } from "./tokens";

export const SESSION_COOKIE = "opurnos_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

export type Session = { userId: string; email: string };

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, "session");
  if (!payload?.email) return null;
  return { userId: payload.sub, email: payload.email };
}

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

export async function createSession(userId: string, email: string) {
  const token = await signToken({ sub: userId, email }, "session", SESSION_TTL);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https://"),
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
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
