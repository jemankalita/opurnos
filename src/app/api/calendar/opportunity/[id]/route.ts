import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";
import { buildIcs, icsResponse, toEvent } from "@/lib/calendar";
import { getDb, schema } from "@/lib/db";
import { fail, handle } from "@/lib/http";

/** One deadline as a .ics file, for "Add to calendar" on an opportunity page. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireApiUser();
  const { id } = await params;
  const db = await getDb();
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, id));
  if (!opp) return fail(404, "Opportunity not found.");
  if (!opp.deadline) return fail(400, "This one has no fixed deadline to add.");
  const event = toEvent({ id: opp.id, title: opp.title, org: opp.org, deadline: opp.deadline, url: opp.applyUrl ?? opp.url });
  return icsResponse(buildIcs([event], opp.title), "deadline.ics");
});
