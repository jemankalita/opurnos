import { requireApiUser } from "@/lib/auth";
import { sendDigest } from "@/lib/digest";
import { handle, ok } from "@/lib/http";

/** "Send my digest now" from Settings, handy for testing the email and for demos. */
export const POST = handle(async () => {
  const { userId } = await requireApiUser();
  return ok(await sendDigest(userId));
});
