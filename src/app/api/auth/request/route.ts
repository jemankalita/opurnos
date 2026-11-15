import { rateLimitKey } from "@/lib/account";
import { safeNext } from "@/lib/auth-redirect";
import { findOrCreateUser, normalizeEmail } from "@/lib/auth";
import { magicLinkEmail, sendEmail } from "@/lib/email";
import { env, isDev } from "@/lib/env";
import { fail, handle, ok } from "@/lib/http";
import { clientAddress } from "@/lib/portal/gate";
import { enforce, LIMITS } from "@/lib/rate-limit";
import { signToken } from "@/lib/tokens";

const MAGIC_TTL = 15 * 60;

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; next?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return fail(400, "Enter a valid email address.");
  await enforce([
    [rateLimitKey("magic-email", email), LIMITS.emailLink],
    [rateLimitKey("magic-address", clientAddress(req.headers)), LIMITS.emailPerAddress],
  ]);

  const user = await findOrCreateUser(email);
  const next = safeNext(body.next, "");
  const token = await signToken({ sub: user.id, email, next }, "magic", MAGIC_TTL);
  const link = `${env.APP_URL}/api/auth/verify?t=${encodeURIComponent(token)}`;
  const { subject, html } = magicLinkEmail(link);
  const sent = await sendEmail({ to: email, subject, html });

  // Without an email provider in development, hand the link back so the flow is testable.
  return ok({ sent: true, devLink: sent.provider === "local" && isDev ? link : undefined });
});
