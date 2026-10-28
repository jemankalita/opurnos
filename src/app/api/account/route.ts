import { eq } from "drizzle-orm";
import { destroySession, requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { deactivateSource } from "@/lib/ingest";

/** Deletes the account and everything tied to it (profile, resume, matches, applications, run logs). */
export const DELETE = handle(async () => {
  const { userId } = await requireApiUser();
  const db = await getDb();
  await db.delete(schema.agentRuns).where(eq(schema.agentRuns.userId, userId));
  // Websites they added go with the account (FK cascade); take those listings off the radar first.
  const sites = await db.select({ id: schema.sources.id }).from(schema.sources).where(eq(schema.sources.addedBy, userId));
  for (const s of sites) await deactivateSource(s.id);
  await db.delete(schema.users).where(eq(schema.users.id, userId)); // cascades to profiles, matches, applications, steps
  await destroySession();
  return ok({ deleted: true });
});

/** Data export (GDPR / DPDP access request). */
export const GET = handle(async () => {
  const { userId } = await requireApiUser();
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const matches = await db.select().from(schema.matches).where(eq(schema.matches.userId, userId));
  const applications = await db.select().from(schema.applications).where(eq(schema.applications.userId, userId));
  return ok({
    user,
    profile: profile ? { ...profile, resumeFile: profile.resumeFile ? "(PDF omitted)" : null } : null,
    matches,
    applications,
  });
});
