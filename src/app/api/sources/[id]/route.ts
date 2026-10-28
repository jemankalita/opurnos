import { and, eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";
import { deactivateSource } from "@/lib/ingest";

/** Stop watching a website you added. Its listings leave everyone's radar. */
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await requireApiUser();
  const { id } = await params;
  const db = await getDb();
  const removed = await db
    .delete(schema.sources)
    .where(and(eq(schema.sources.id, id), eq(schema.sources.kind, "website"), eq(schema.sources.addedBy, userId)))
    .returning({ id: schema.sources.id });
  if (removed.length === 0) return fail(404, "That website isn't one you added.");
  await deactivateSource(id);
  return ok({ removed: id });
});
