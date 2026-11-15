import { SignJWT, jwtVerify } from "jose";
import { authSecret } from "../env";

// Kept apart from lib/tokens.ts, which imports the database: the proxy needs this and must stay light.

export const PORTAL_COOKIE = "opurnos_portal";
export const PORTAL_TTL_SECONDS = 60 * 60 * 24 * 30;
export const PORTAL_HOME = "/portal";

const PURPOSE = "portal";
const key = () => new TextEncoder().encode(authSecret());

export async function signPortalToken(): Promise<string> {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + PORTAL_TTL_SECONDS)
    .sign(key());
}

/** Verifies signature, expiry and purpose. Returns false instead of throwing. */
export async function isPortalToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.purpose === PURPOSE;
  } catch {
    return false;
  }
}

/** Only ever a path on this site, so the gate can't be used to bounce someone elsewhere. */
export function safeNextPath(next: string | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : PORTAL_HOME;
}
