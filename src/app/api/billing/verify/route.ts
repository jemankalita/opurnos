import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { confirmCheckout } from "@/lib/billing/razorpay";
import { handle, ok } from "@/lib/http";

const Body = z.object({
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i),
});

/** Checkout's success callback. The signature is checked against the subscription we created. */
export const POST = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const body = Body.parse(await req.json());
  await confirmCheckout(userId, body.razorpay_payment_id, body.razorpay_signature);
  return ok({ plan: "pro" });
});
