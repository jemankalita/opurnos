import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { userForGoogle } from "@/lib/account";
import { createSession } from "@/lib/auth";
import { safeNext } from "@/lib/auth-redirect";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { googleIdentityFromCode } from "@/lib/google-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!code || !state || url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/login?error=google", env.APP_URL));
  }
  try {
    const identity = await googleIdentityFromCode(code, state);
    const user = await userForGoogle(identity);
    await createSession(user.id, user.email);
    const db = await getDb();
    const [profile] = await db.select({ onboarded: schema.profiles.onboarded }).from(schema.profiles).where(eq(schema.profiles.userId, user.id));
    const next = safeNext(identity.next, profile?.onboarded ? "/radar" : "/start");
    return NextResponse.redirect(new URL(next, env.APP_URL));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google", env.APP_URL));
  }
}
