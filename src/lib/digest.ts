import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "./db";
import { digestEmail, sendEmail, type DigestItem } from "./email";
import { env } from "./env";
import { signToken } from "./tokens";

const DIGEST_SIZE = 8;
const APPLY_LINK_TTL = 60 * 60 * 72;

export async function buildDigest(userId: string): Promise<{ items: DigestItem[]; opportunityIds: string[] }> {
  const db = await getDb();
  const rows = await db
    .select({
      opportunityId: schema.matches.opportunityId,
      verdict: schema.matches.verdict,
      score: schema.matches.score,
      why: schema.matches.why,
      title: schema.opportunities.title,
      org: schema.opportunities.org,
      type: schema.opportunities.type,
      deadline: schema.opportunities.deadline,
      comp: schema.opportunities.comp,
    })
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(
      and(
        eq(schema.matches.userId, userId),
        isNull(schema.matches.emailedAt),
        ne(schema.matches.verdict, "ineligible"),
        inArray(schema.matches.status, ["new", "saved"]),
        eq(schema.opportunities.isActive, true),
      ),
    )
    .orderBy(desc(schema.matches.score))
    .limit(DIGEST_SIZE);

  const items = await Promise.all(
    rows.map(async (r) => {
      // Signed link: opens Apply Studio for this user; it never submits anything by itself.
      const token = await signToken({ sub: userId, opp: r.opportunityId }, "apply", APPLY_LINK_TTL);
      return {
        ...r,
        applyUrl: `${env.APP_URL}/api/apply/link?t=${encodeURIComponent(token)}`,
        detailUrl: `${env.APP_URL}/o/${r.opportunityId}`,
      };
    }),
  );
  return { items, opportunityIds: rows.map((r) => r.opportunityId) };
}

export async function sendDigest(userId: string): Promise<{ sent: boolean; count: number }> {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  if (!user || !profile) return { sent: false, count: 0 };
  const { items, opportunityIds } = await buildDigest(userId);
  if (items.length === 0) return { sent: false, count: 0 };
  const { subject, html } = digestEmail(profile.parsed?.name ?? "", items, profile.prefs.language ?? "en");
  await sendEmail({ to: user.email, subject, html });
  const now = new Date();
  await db
    .update(schema.matches)
    .set({ emailedAt: now })
    .where(and(eq(schema.matches.userId, userId), inArray(schema.matches.opportunityId, opportunityIds)));
  await db.update(schema.profiles).set({ lastDigestAt: now }).where(eq(schema.profiles.userId, userId));
  return { sent: true, count: items.length };
}

export function isDigestDue(digest: "daily" | "weekly" | "off", last: Date | null, now = new Date()): boolean {
  if (digest === "off") return false;
  if (!last) return true;
  const hours = (now.getTime() - last.getTime()) / 3_600_000;
  return digest === "daily" ? hours >= 20 : hours >= 24 * 6.5;
}

export async function sendDueDigests() {
  const db = await getDb();
  const profiles = await db.select().from(schema.profiles).where(eq(schema.profiles.onboarded, true));
  const results: { userId: string; sent: boolean; count: number; error?: string }[] = [];
  for (const p of profiles) {
    if (!isDigestDue(p.prefs.digest, p.lastDigestAt)) continue;
    try {
      results.push({ userId: p.userId, ...(await sendDigest(p.userId)) });
    } catch (err) {
      results.push({ userId: p.userId, sent: false, count: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
