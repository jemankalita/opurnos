import { sql } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { handle, ok } from "@/lib/http";
import { runIngest } from "@/lib/ingest";
import { runMatching } from "@/lib/matching";

export const maxDuration = 300;

export const POST = handle(async () => {
  const { userId } = await requireApiUser();
  const db = await getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.opportunities);
  // First run on a fresh database: fill it before matching.
  const ingested = Number(count) === 0 ? await runIngest() : null;
  const result = await runMatching(userId, { withScout: !isDemoMode });
  return ok({ ...result, ingested: ingested?.reduce((s, r) => s + r.count, 0) ?? null });
});
