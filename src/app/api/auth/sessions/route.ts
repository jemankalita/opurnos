import { destroySession, listSessions, requireApiUser, revokeOtherSessions, revokeSession } from "@/lib/auth";
import { fail, handle, ok } from "@/lib/http";

export const GET = handle(async () => {
  const session = await requireApiUser();
  return ok(await listSessions(session.userId, session.sessionId));
});

export const DELETE = handle(async (req: Request) => {
  const session = await requireApiUser();
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; others?: unknown };
  if (body.others === true) return ok({ revoked: await revokeOtherSessions(session.userId, session.sessionId) });
  if (typeof body.id !== "string" || !body.id) return fail(400, "Say which session to sign out.");
  const revoked = await revokeSession(session.userId, body.id);
  if (body.id === session.sessionId) await destroySession();
  return ok({ revoked });
});
