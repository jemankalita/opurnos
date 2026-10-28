import { sendDueDigests } from "@/lib/digest";
import { env, isDev } from "@/lib/env";
import { bearerMatches, fail, handle, ok } from "@/lib/http";
import { runIngest } from "@/lib/ingest";
import { runMatching, usersDueForMatching } from "@/lib/matching";

export const maxDuration = 800;

/**
 * Scheduled jobs. Production: call with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this automatically). Suggested cadence:
 *   ingest every 6h · match every 6h (after ingest) · digest hourly (sends in each user's due window)
 */
export const GET = handle(async (req: Request, { params }: { params: Promise<{ job: string }> }) => {
  if (!isDev && !bearerMatches(req, env.CRON_SECRET)) return fail(401, "Unauthorized");
  const { job } = await params;
  switch (job) {
    case "ingest": {
      const results = await runIngest();
      return ok({ total: results.reduce((s, r) => s + r.count, 0), sources: results });
    }
    case "match": {
      const users = await usersDueForMatching();
      const results = [];
      for (const { userId } of users) {
        try {
          results.push({ userId, ...(await runMatching(userId, { withScout: true })) });
        } catch (err) {
          results.push({ userId, error: err instanceof Error ? err.message : String(err) });
        }
      }
      return ok({ users: results.length, results });
    }
    case "digest":
      return ok({ results: await sendDueDigests() });
    default:
      return fail(404, `Unknown job "${job}"`);
  }
});
