import { requestPasswordReset } from "@/lib/account";
import { handle, ok } from "@/lib/http";
import { clientAddress } from "@/lib/portal/gate";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  return ok(await requestPasswordReset(body.email, clientAddress(req.headers)));
});
