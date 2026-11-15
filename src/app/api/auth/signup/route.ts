import { signUp } from "@/lib/account";
import { handle, ok } from "@/lib/http";
import { clientAddress } from "@/lib/portal/gate";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; email?: unknown; password?: unknown };
  return ok(await signUp({ name: body.name, email: body.email, password: body.password }, clientAddress(req.headers)));
});
