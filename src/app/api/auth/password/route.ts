import { changePassword } from "@/lib/account";
import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const session = await requireApiUser();
  const body = (await req.json().catch(() => ({}))) as { current?: unknown; next?: unknown };
  return ok(await changePassword(session, { current: body.current, next: body.next }));
});
