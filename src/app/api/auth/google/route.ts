import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth-redirect";
import { env } from "@/lib/env";
import { googleAuthorizeUrl } from "@/lib/google-oauth";

export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  try {
    return NextResponse.redirect(await googleAuthorizeUrl(next));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google", env.APP_URL));
  }
}
