import { resetPassword } from "@/lib/account";
import { handle, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
  return ok(await resetPassword({ token: body.token, password: body.password }));
});
