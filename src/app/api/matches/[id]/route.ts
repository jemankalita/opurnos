import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";
import { MATCH_STATUSES } from "@/lib/schemas";

const Body = z.object({
  status: z.enum(MATCH_STATUSES).optional(),
  feedback: z.union([z.literal(-1), z.literal(1), z.null()]).optional(),
  reason: z.string().max(200).optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await requireApiUser();
  const { id } = await params;
  const body = Body.parse(await req.json());
  const db = await getDb();
  const updated = await db
    .update(schema.matches)
    .set({
      ...(body.status ? { status: body.status } : {}),
      ...(body.feedback !== undefined ? { feedback: body.feedback } : {}),
      ...(body.reason ? { feedbackReason: body.reason } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.matches.userId, userId), eq(schema.matches.opportunityId, id)))
    .returning({ status: schema.matches.status });
  if (!updated.length) return fail(404, "Match not found.");
  return ok(updated[0]);
});
