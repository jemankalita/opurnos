import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present). Every page and route re-verifies the session server-side.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("opurnos_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/radar/:path*", "/start/:path*", "/o/:path*", "/apply/:path*", "/pipeline/:path*", "/settings/:path*"],
};
