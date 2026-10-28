import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { TailoredSchema } from "@/lib/schemas";
import {
  approveMaterials,
  approveSubmit,
  cancelApplication,
  getApplicationView,
  markSubmittedManually,
  saveMaterials,
} from "@/lib/apply/service";

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireApiUser();
  const { id } = await params;
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const view = await getApplicationView(userId, id, after);
  return ok({
    state: view.app.state,
    error: view.app.error,
    tailored: view.app.tailored,
    verifier: view.app.verifier,
    acceptedClaims: view.app.acceptedClaims,
    fields: view.app.fields,
    submittedAt: view.app.submittedAt,
    agentSupported: view.agentSupported,
    steps: view.steps.map((s) => ({ seq: s.seq, kind: s.kind, message: s.message, screenshot: s.screenshot, at: s.createdAt })),
  });
});

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), tailored: TailoredSchema }),
  z.object({ action: z.literal("approve"), acceptedClaims: z.array(z.string().max(2000)).max(100) }),
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("manual") }),
  z.object({ action: z.literal("cancel") }),
]);

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireApiUser();
  const { id } = await params;
  const body = Action.parse(await req.json());
  switch (body.action) {
    case "save":
      return ok({ verifier: await saveMaterials(userId, id, body.tailored) });
    case "approve":
      return ok(await approveMaterials(userId, id, body.acceptedClaims));
    case "submit":
      await approveSubmit(userId, id);
      return ok({ state: "submitting" });
    case "manual":
      await markSubmittedManually(userId, id);
      return ok({ state: "submitted" });
    case "cancel":
      await cancelApplication(userId, id);
      return ok({ state: "cancelled" });
  }
});
