import { SignJWT, jwtVerify } from "jose";
import { getDb, schema } from "./db";
import { authSecret } from "./env";

export type TokenPurpose = "session" | "magic" | "apply" | "calendar";

const key = () => new TextEncoder().encode(authSecret());

export async function signToken(
  claims: { sub: string; email?: string; [k: string]: unknown },
  purpose: TokenPurpose,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({ ...claims, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(key());
}

export type VerifiedToken = { sub: string; email?: string; jti: string; [k: string]: unknown };

/** Verifies signature, expiry and purpose. Returns null instead of throwing. */
export async function verifyToken(token: string, purpose: TokenPurpose): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.purpose !== purpose || !payload.sub || !payload.jti) return null;
    return payload as VerifiedToken;
  } catch {
    return null;
  }
}

/** Marks a token as used. Returns false if it was already consumed (replay). */
export async function consumeToken(jti: string): Promise<boolean> {
  const db = await getDb();
  const inserted = await db.insert(schema.usedTokens).values({ jti }).onConflictDoNothing().returning();
  return inserted.length === 1;
}
