import { signIn } from "@/lib/account";
import { handle, ok } from "@/lib/http";
import { clientAddress } from "@/lib/portal/gate";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const result = await signIn({ email: body.email, password: body.password }, clientAddress(req.headers));
  return ok(result);
});
