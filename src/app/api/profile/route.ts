import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";
import { ensureProfileRow } from "@/lib/profile";
import { profileKeywords } from "@/lib/ranking";
import { PreferencesSchema, ProfileSchema } from "@/lib/schemas";

const Body = z.object({
  parsed: ProfileSchema.optional(),
  prefs: PreferencesSchema.optional(),
  onboarded: z.boolean().optional(),
});

export const PUT = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const body = Body.parse(await req.json());
  const row = await ensureProfileRow(userId);
  const parsed = body.parsed ?? row.parsed;
  const prefs = body.prefs ?? row.prefs;
  if (body.onboarded && !parsed) return fail(400, "Add your resume before finishing setup.");
  const db = await getDb();
  await db
    .update(schema.profiles)
    .set({
      parsed,
      prefs,
      keywords: parsed ? profileKeywords(parsed, prefs) : row.keywords,
      onboarded: body.onboarded ?? row.onboarded,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, userId));
  // Preference changes invalidate untouched judgements; saved/applied items stay in the pipeline.
  if (body.prefs || body.parsed) {
    await db.delete(schema.matches).where(and(eq(schema.matches.userId, userId), eq(schema.matches.status, "new")));
  }
  return ok({ saved: true });
});
