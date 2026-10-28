import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { consumeToken, verifyToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const payload = await verifyToken(token, "magic");
  if (!payload?.email || !(await consumeToken(payload.jti))) {
    return NextResponse.redirect(new URL("/login?error=expired", env.APP_URL));
  }
  await createSession(payload.sub, payload.email);
  const db = await getDb();
  const [profile] = await db.select({ onboarded: schema.profiles.onboarded }).from(schema.profiles).where(eq(schema.profiles.userId, payload.sub));
  const next = typeof payload.next === "string" && payload.next ? payload.next : profile?.onboarded ? "/radar" : "/start";
  return NextResponse.redirect(new URL(next, env.APP_URL));
}
