import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { createSession, findOrCreateUser, findUserByEmail, HttpError, markEmailVerified, normalizeEmail, revokeOtherSessions } from "./auth";
import { getDb, schema } from "./db";
import { passwordResetEmail, sendEmail, verifyEmailMessage } from "./email";
import { authSecret, env, isDev } from "./env";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { enforce, LIMITS } from "./rate-limit";
import { consumeToken, signToken, verifyToken } from "./tokens";

// Account flows behind the /api/auth routes. Routes stay thin: parse, call one of these, respond.

const VERIFY_TTL = 2 * 24 * 60 * 60;
const RESET_TTL = 30 * 60;
const MAX_NAME = 80;
const WRONG_LOGIN = "That email and password don't match. Try again, or use \"Forgot password\".";

/** Rate-limit keys never hold a raw email or IP address. */
export const rateLimitKey = (action: string, value: string) =>
  `${action}:${createHash("sha256").update(`${authSecret()}:${value}`).digest("hex").slice(0, 32)}`;

export type DevLink = { devLink?: string };

async function sendLink(to: string, message: { subject: string; html: string }, link: string): Promise<DevLink> {
  const sent = await sendEmail({ to, ...message });
  // Without an email provider in development, hand the link back so the flow is testable.
  return { devLink: sent.provider === "local" && isDev ? link : undefined };
}

export async function sendVerificationEmail(userId: string, email: string): Promise<DevLink> {
  const token = await signToken({ sub: userId, email }, "verify", VERIFY_TTL);
  const link = `${env.APP_URL}/api/auth/verify-email?t=${encodeURIComponent(token)}`;
  return sendLink(email, verifyEmailMessage(link), link);
}

function requireEmail(raw: unknown): string {
  const email = normalizeEmail(raw);
  if (!email) throw new HttpError(400, "Enter a valid email address.");
  return email;
}

function requirePassword(raw: unknown, email: string): string {
  const password = typeof raw === "string" ? raw : "";
  const problem = passwordProblem(password, email);
  if (problem) throw new HttpError(400, problem);
  return password;
}

export async function signUp(input: { name?: unknown; email: unknown; password: unknown }, address: string): Promise<DevLink & { userId: string }> {
  const email = requireEmail(input.email);
  const password = requirePassword(input.password, email);
  const name = typeof input.name === "string" ? input.name.trim().slice(0, MAX_NAME) || null : null;
  await enforce([[rateLimitKey("signup", address), LIMITS.signup]]);

  if (await findUserByEmail(email)) {
    throw new HttpError(409, "An account with this email already exists. Sign in, or use \"Forgot password\" to set a password.");
  }
  const db = await getDb();
  const [user] = await db
    .insert(schema.users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .onConflictDoNothing()
    .returning();
  if (!user) throw new HttpError(409, "An account with this email already exists. Sign in instead.");
  await createSession(user.id, email);
  return { userId: user.id, ...(await sendVerificationEmail(user.id, email)) };
}

export async function signIn(input: { email: unknown; password: unknown }, address: string): Promise<{ userId: string }> {
  const email = requireEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  await enforce([
    [rateLimitKey("login-email", email), LIMITS.login],
    [rateLimitKey("login-address", address), LIMITS.login],
  ]);
  const user = await findUserByEmail(email);
  // Hash anyway when there's no password to check, so timing doesn't reveal which emails exist.
  const isMatch = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!user || !isMatch) throw new HttpError(401, WRONG_LOGIN);
  await createSession(user.id, email);
  return { userId: user.id };
}

/** Always looks the same to the caller, so it can't be used to find out who has an account. */
export async function requestPasswordReset(rawEmail: unknown, address: string): Promise<DevLink> {
  const email = requireEmail(rawEmail);
  await enforce([
    [rateLimitKey("reset-email", email), LIMITS.passwordReset],
    [rateLimitKey("email-address", address), LIMITS.emailPerAddress],
  ]);
  const user = await findUserByEmail(email);
  if (!user) return {};
  const token = await signToken({ sub: user.id, email }, "reset", RESET_TTL);
  const link = `${env.APP_URL}/reset?t=${encodeURIComponent(token)}`;
  return sendLink(email, passwordResetEmail(link), link);
}

/** Sets the new password, proves the email, and signs out every other device. */
export async function resetPassword(input: { token: unknown; password: unknown }): Promise<{ userId: string }> {
  const payload = await verifyToken(typeof input.token === "string" ? input.token : "", "reset");
  if (!payload?.email) throw new HttpError(400, "That reset link expired or isn't valid. Ask for a new one.");
  const password = requirePassword(input.password, payload.email);
  if (!(await consumeToken(payload.jti))) throw new HttpError(400, "That reset link was already used. Ask for a new one.");

  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, payload.sub));
  await markEmailVerified(payload.sub);
  await revokeOtherSessions(payload.sub, null);
  await createSession(payload.sub, payload.email);
  return { userId: payload.sub };
}

export async function verifyEmail(token: string): Promise<boolean> {
  const payload = await verifyToken(token, "verify");
  if (!payload) return false;
  const db = await getDb();
  const [user] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, payload.sub));
  // A link for an address the account no longer uses proves nothing.
  if (!user || user.email !== payload.email) return false;
  if (!(await consumeToken(payload.jti))) return false;
  await markEmailVerified(payload.sub);
  return true;
}

/** Changing needs the current password; an account without one (email links, Google) can set one. */
export async function changePassword(
  session: { userId: string; email: string; sessionId: string },
  input: { current?: unknown; next: unknown },
): Promise<{ signedOutOthers: number }> {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId));
  if (!user) throw new HttpError(404, "Account not found.");
  await enforce([[rateLimitKey("login-email", user.email), LIMITS.login]]);
  if (user.passwordHash && !(await verifyPassword(typeof input.current === "string" ? input.current : "", user.passwordHash))) {
    throw new HttpError(400, "Your current password isn't right.");
  }
  const next = requirePassword(input.next, user.email);
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, user.id));
  return { signedOutOthers: await revokeOtherSessions(user.id, session.sessionId) };
}

export type GoogleIdentity = { sub: string; email: string; emailVerified: boolean; name?: string };

/**
 * Finds the account for a Google sign-in: by Google id first, then by email. Linking by email is
 * safe only because Google says it verified the address.
 */
export async function userForGoogle(identity: GoogleIdentity): Promise<{ id: string; email: string }> {
  if (!identity.emailVerified) throw new HttpError(400, "Google hasn't verified that email address, so we can't use it to sign in.");
  const email = requireEmail(identity.email);
  const db = await getDb();
  const [linked] = await db.select().from(schema.users).where(eq(schema.users.googleSub, identity.sub));
  if (linked) return linked;

  const user = await findOrCreateUser(email);
  await db
    .update(schema.users)
    .set({ googleSub: identity.sub, name: user.name ?? identity.name?.slice(0, MAX_NAME) ?? null })
    .where(eq(schema.users.id, user.id));
  await markEmailVerified(user.id);
  return user;
}

export async function accountSummary(userId: string) {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleSub),
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
