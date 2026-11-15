import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/account";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const verified = await verifyEmail(token);
  const next = verified ? "/login?verified=1" : "/login?error=verify";
  return NextResponse.redirect(new URL(next, env.APP_URL));
}
