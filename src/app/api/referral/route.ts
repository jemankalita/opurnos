import { eq } from "drizzle-orm";
import { z } from "zod";
import { draftReferral } from "@/lib/ai/agents";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";

export const maxDuration = 60;

const Body = z.object({ opportunityId: z.string().min(1).max(64) });

/** Drafts a referral request for one opportunity. It is only shown to the user; nothing is sent. */
export const POST = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const { opportunityId } = Body.parse(await req.json());
  const db = await getDb();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  if (!profile?.parsed) return fail(400, "Upload your resume first, so the request can say who you are.");
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) return fail(404, "Opportunity not found.");
  const draft = await draftReferral({ userId, profile: profile.parsed, prefs: profile.prefs, opp });
  return ok({ ...draft.value, by: draft.by });
});
