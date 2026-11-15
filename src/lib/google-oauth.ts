import { HttpError } from "./auth";
import { env, isGoogleAuthEnabled } from "./env";
import { consumeToken, signToken, verifyToken } from "./tokens";
import type { GoogleIdentity } from "./account";

const STATE_TTL = 10 * 60;

export function googleRedirectUri(): string {
  return `${env.APP_URL}/api/auth/google/callback`;
}

/** Starts "Continue with Google". The state token carries where to send the person afterwards. */
export async function googleAuthorizeUrl(next: string): Promise<string> {
  if (!isGoogleAuthEnabled || !env.GOOGLE_CLIENT_ID) throw new HttpError(404, "Google sign-in isn't turned on.");
  const state = await signToken({ sub: "google", next }, "oauth-state", STATE_TTL);
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

type GoogleUserInfo = { sub?: string; email?: string; email_verified?: boolean; name?: string };

/** Trades the callback code for a verified Google identity. The state token is single-use. */
export async function googleIdentityFromCode(code: string, state: string): Promise<GoogleIdentity & { next: string }> {
  if (!isGoogleAuthEnabled || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(404, "Google sign-in isn't turned on.");
  }
  const payload = await verifyToken(state, "oauth-state");
  if (!payload) throw new HttpError(400, "That Google sign-in expired. Try again.");
  if (!(await consumeToken(payload.jti))) throw new HttpError(400, "That Google sign-in was already used. Try again.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!tokenRes.ok || !token.access_token) throw new HttpError(400, "Google didn't accept that sign-in. Try again.");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  const info = (await infoRes.json().catch(() => ({}))) as GoogleUserInfo;
  if (!infoRes.ok || !info.sub || !info.email) throw new HttpError(400, "Google didn't share an email address. Try again.");
  return {
    sub: info.sub,
    email: info.email,
    emailVerified: info.email_verified === true,
    name: info.name,
    next: typeof payload.next === "string" ? payload.next : "/radar",
  };
}
