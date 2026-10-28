import { requireApiUser } from "@/lib/auth";
import { createSubscription } from "@/lib/billing/razorpay";
import { env } from "@/lib/env";
import { handle, ok } from "@/lib/http";

/** Creates a Razorpay subscription for Pro; the browser then opens Checkout with its id. */
export const POST = handle(async () => {
  const { userId, email } = await requireApiUser();
  const { subscriptionId, keyId } = await createSubscription(userId);
  return ok({ subscriptionId, keyId, email, name: env.COMPANY_NAME });
});
