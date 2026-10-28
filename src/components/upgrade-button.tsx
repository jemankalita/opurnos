"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type CheckoutResponse = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type RazorpayCheckout = { open(): void; on(event: string, cb: (e: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement("script"), { src: CHECKOUT_SRC, async: true });
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const json = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

/** Starts a Razorpay subscription for Pro and opens Checkout. Signed-out visitors go to sign in. */
export function UpgradeButton({ signedIn = true, label = "Upgrade to Pro", className }: { signedIn?: boolean; label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upgrade() {
    if (!signedIn) return router.push("/login?next=/settings");
    setError(null);
    setBusy(true);
    try {
      const [{ subscriptionId, keyId, email, name }] = await Promise.all([
        post<{ subscriptionId: string; keyId: string; email: string; name: string }>("/api/billing/subscribe"),
        loadCheckout(),
      ]);
      const checkout = new window.Razorpay!({
        key: keyId,
        subscription_id: subscriptionId,
        name,
        description: "Pro, billed monthly",
        prefill: { email },
        theme: { color: "#111111" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (res: CheckoutResponse) => {
          try {
            await post("/api/billing/verify", res);
            setDone(true);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", (e) => {
        setError(e.error?.description ?? "The payment didn't go through. Nothing was charged.");
        setBusy(false);
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (done) return <p className="text-sm">You&apos;re on Pro. Thanks for supporting Opurnos.</p>;
  return (
    <div className={className}>
      <Button onClick={upgrade} disabled={busy}>
        {busy ? <Spinner /> : null}
        {label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
