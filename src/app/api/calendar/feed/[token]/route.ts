import { buildIcs, calendarEvents, icsResponse, userForFeedToken } from "@/lib/calendar";
import { fail, handle } from "@/lib/http";

// Calendar apps poll this without a session cookie, so the signed token in the path is the credential.
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const userId = await userForFeedToken(decodeURIComponent(token));
  if (!userId) return fail(404, "This calendar link is invalid or has expired. Get a new one in Opurnos settings.");
  return icsResponse(buildIcs(await calendarEvents(userId)), "opurnos.ics");
});
