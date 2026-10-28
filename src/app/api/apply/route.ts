import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { startApplication } from "@/lib/apply/service";

export const maxDuration = 180;

const Body = z.object({ opportunityId: z.string().min(1).max(64) });

export const POST = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const { opportunityId } = Body.parse(await req.json());
  const id = await startApplication(userId, opportunityId);
  return ok({ id });
});
