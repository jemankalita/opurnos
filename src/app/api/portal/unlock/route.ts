import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { handle } from "@/lib/http";
import { attemptPasscode, visitorKey } from "@/lib/portal/gate";
import { PORTAL_COOKIE, PORTAL_TTL_SECONDS, signPortalToken } from "@/lib/portal/gate-token";

const Body = z.object({ passcode: z.string().max(100) });

export const POST = handle(async (req: Request) => {
  const { passcode } = Body.parse(await req.json());
  const result = await attemptPasscode(visitorKey(req.headers), passcode);
  const res = NextResponse.json({ ok: true, data: result });
  if (result.status === "ok") {
    res.cookies.set(PORTAL_COOKIE, await signPortalToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: env.APP_URL.startsWith("https://"),
      path: "/",
      maxAge: PORTAL_TTL_SECONDS,
    });
  }
  return res;
});
