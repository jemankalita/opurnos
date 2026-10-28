import { findOrCreateUser, normalizeEmail } from "@/lib/auth";
import { magicLinkEmail, sendEmail } from "@/lib/email";
import { env, isDev } from "@/lib/env";
import { fail, handle, ok } from "@/lib/http";
import { signToken } from "@/lib/tokens";

const MAGIC_TTL = 15 * 60;

// Per-email throttle (in-memory; good enough for a single instance, swap for Redis when scaling out).
const lastSent = new Map<string, number>();
const THROTTLE_MS = 30_000;

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; next?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return fail(400, "Enter a valid email address.");
  const now = Date.now();
  if (now - (lastSent.get(email) ?? 0) < THROTTLE_MS) return fail(429, "We just sent a link. Give it 30 seconds before asking again.");
  lastSent.set(email, now);

  const user = await findOrCreateUser(email);
  const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : "";
  const token = await signToken({ sub: user.id, email, next }, "magic", MAGIC_TTL);
  const link = `${env.APP_URL}/api/auth/verify?t=${encodeURIComponent(token)}`;
  const { subject, html } = magicLinkEmail(link);
  const sent = await sendEmail({ to: email, subject, html });

  // Without an email provider in development, hand the link back so the flow is testable.
  return ok({ sent: true, devLink: sent.provider === "local" && isDev ? link : undefined });
});
