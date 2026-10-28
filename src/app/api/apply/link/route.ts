import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createSession, getSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { consumeToken, verifyToken } from "@/lib/tokens";

/**
 * "Apply now" from the digest email. It only ever opens the opportunity with the apply flow
 * ready; nothing is drafted or submitted without a click inside the app.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const payload = await verifyToken(token, "apply");
  const opp = typeof payload?.opp === "string" ? payload.opp : null;
  if (!payload || !opp) return NextResponse.redirect(new URL("/login?error=expired", env.APP_URL));

  const target = new URL(`/o/${encodeURIComponent(opp)}?apply=1`, env.APP_URL);
  const session = await getSession();
  if (session?.userId === payload.sub) return NextResponse.redirect(target);

  // Signed out: the link may sign the owner in once (like a magic link). Replays fall back to /login.
  if (!(await consumeToken(payload.jti))) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(target.pathname + target.search)}`, env.APP_URL));
  }
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.sub));
  if (!user) return NextResponse.redirect(new URL("/login?error=expired", env.APP_URL));
  await createSession(user.id, user.email);
  return NextResponse.redirect(target);
}
