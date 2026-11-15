import { NextResponse, type NextRequest } from "next/server";
import { isPortalToken, PORTAL_COOKIE } from "@/lib/portal/gate-token";

// Private-beta gate: only when PORTAL_PASSCODE is set. Legal and pricing pages stay public either way,
// because Razorpay's review needs them reachable.
const GATE_OPEN_PATHS = ["/gate", "/pricing", "/privacy", "/terms", "/refunds", "/contact", "/login", "/forgot", "/reset"];
const SIGNED_IN_PATHS = ["/radar", "/start", "/o", "/apply", "/pipeline", "/settings", "/portal"];

const isUnder = (pathname: string, paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
const isGateOn = () => Boolean(process.env.PORTAL_PASSCODE?.trim());

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isGateOn()) {
    const isUnlocked = await isPortalToken(request.cookies.get(PORTAL_COOKIE)?.value);
    if (!isUnlocked && !isUnder(pathname, GATE_OPEN_PATHS)) {
      const url = new URL("/gate", request.url);
      if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    if (isUnlocked && pathname === "/gate") return NextResponse.redirect(new URL("/", request.url));
  } else if (pathname === "/gate") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Optimistic check only (cookie present). Every page and route re-verifies the session server-side.
  if (isUnder(pathname, SIGNED_IN_PATHS) && !request.cookies.has("opurnos_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes (cron, webhooks, calendar feeds have their own auth), build assets and files.
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
