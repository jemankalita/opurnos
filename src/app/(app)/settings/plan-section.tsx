"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UpgradeButton } from "@/components/upgrade-button";
import { Button, Panel, SectionLabel } from "@/components/ui";

export type Billing = {
  enabled: boolean;
  plan: "free" | "pro";
  priceInr: number;
  status: string | null;
  periodEnd: string | null;
  cancelAtCycleEnd: boolean;
};

const LIVE = new Set(["authenticated", "active", "pending"]);
const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function statusLine(b: Billing): string {
  if (!b.enabled) return "Billing is off on this server, so every Pro feature is on.";
  if (b.plan === "free") return `Free. Pro is ₹${b.priceInr}/month.`;
  if (b.status === "pending") return "Pro. Your last renewal didn't go through; Razorpay is retrying it.";
  if (!LIVE.has(b.status ?? "") || b.cancelAtCycleEnd) {
    return b.periodEnd ? `Pro until ${date(b.periodEnd)}. It won't renew.` : "Pro. It won't renew.";
  }
  return b.periodEnd ? `Pro, ₹${b.priceInr}/month. Renews on ${date(b.periodEnd)}.` : `Pro, ₹${b.priceInr}/month.`;
}

export function PlanSection({ billing }: { billing: Billing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCancel = billing.enabled && LIVE.has(billing.status ?? "") && !billing.cancelAtCycleEnd;

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const json = await fetch("/api/billing/cancel", { method: "POST" }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-5" id="plan">
      <SectionLabel>Plan</SectionLabel>
      <p className="mt-2 text-sm">{statusLine(billing)}</p>
      {billing.enabled && billing.plan === "free" ? (
        <>
          <p className="mt-2 text-xs text-muted">Pro adds AI eligibility judging, tailored applications with the apply agent, AI referral drafts, live web search and 10 watched websites.</p>
          <UpgradeButton className="mt-3" />
        </>
      ) : null}
      {canCancel ? (
        confirming ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">You&apos;ll keep Pro until the end of the period you&apos;ve paid for. Nothing more will be charged.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={cancel} disabled={busy}>
                Cancel renewal
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
                Keep Pro
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setConfirming(true)}>
            Cancel subscription
          </Button>
        )
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-faint">
        <Link href="/pricing" className="underline">
          Compare plans
        </Link>{" "}
        ·{" "}
        <Link href="/refunds" className="underline">
          Cancellation and refunds
        </Link>
      </p>
    </Panel>
  );
}
