import { accountSummary, rateLimitKey, sendVerificationEmail } from "@/lib/account";
import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { enforce, LIMITS } from "@/lib/rate-limit";

export const POST = handle(async () => {
  const session = await requireApiUser();
  const summary = await accountSummary(session.userId);
  if (!summary) return ok({ already: false });
  if (summary.emailVerified) return ok({ already: true });
  await enforce([
    [rateLimitKey("verify-email", session.email), LIMITS.emailLink],
    [rateLimitKey("verify-email-hour", session.email), LIMITS.emailPerAddress],
  ]);
  return ok(await sendVerificationEmail(session.userId, session.email));
});
