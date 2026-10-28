import { requireApiUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/billing/razorpay";
import { handle, ok } from "@/lib/http";

/** Stops renewal. Pro stays on until the end of the period already paid for. */
export const POST = handle(async () => {
  const { userId } = await requireApiUser();
  const { status, periodEnd } = await cancelSubscription(userId);
  return ok({ status, periodEnd: periodEnd?.toISOString() ?? null });
});
