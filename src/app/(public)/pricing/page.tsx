import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { ButtonLink, Panel } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { env, isBillingEnabled } from "@/lib/env";
import { getPlan, planLimits } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Opurnos is free for the radar, eligibility checks and digests. Pro adds the AI that tailors and applies.",
};

const FREE = [
  "The radar: internships, jobs, hackathons, fellowships, scholarships, exams and research roles",
  "Eligibility checked against each listing's rules, with the evidence quoted",
  "Daily or weekly email digest, in English or Hindi",
  "Deadline calendar feed for Google Calendar, Outlook or Apple Calendar",
  "Scam warnings on listings that ask you for money",
  "Pay compared with similar listings",
  "Referral request templates",
  `Watch ${planLimits("free").watchedSites} websites of your choice`,
];

const PRO = [
  "Everything in Free",
  "AI eligibility judging that reads the whole listing, not just the rules",
  "Tailored applications, with every claim checked against your resume",
  `The apply agent fills standard forms for you, up to ${env.PRO_DAILY_APPLY_CAP} a day; you approve before anything is sent`,
  "Referral requests written for the specific role",
  "Live web search for opportunities our sources don't cover",
  `Watch ${planLimits("pro").watchedSites} websites`,
];

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5 text-[15px]">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const session = await getSession();
  const plan = session ? await getPlan(session.userId) : null;
  return (
    <div>
      <p className="label">Pricing</p>
      <h1 className="mt-3 font-display text-[44px] leading-[0.95] uppercase md:text-[60px]">
        Free to find. <em className="font-serif normal-case italic">Pro</em> to apply.
      </h1>
      <p className="mt-4 max-w-[60ch] text-[17px] text-muted">
        Finding what you&apos;re eligible for shouldn&apos;t cost anything. Pro pays for the AI that reads, writes and fills forms on your behalf.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Panel className="flex flex-col p-6 md:p-8">
          <h2 className="font-display text-[28px] uppercase">Free</h2>
          <p className="mt-2">
            <span className="font-display text-[40px]">₹0</span>
          </p>
          <Features items={FREE} />
          <div className="mt-auto pt-8">
            {session ? (
              <p className="text-sm text-muted">{plan === "free" ? "Your current plan." : "Included with your plan."}</p>
            ) : (
              <ButtonLink href="/login" variant="secondary">
                Start free
              </ButtonLink>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col border-text/60 p-6 md:p-8">
          <h2 className="font-display text-[28px] uppercase">Pro</h2>
          <p className="mt-2">
            <span className="font-display text-[40px]">₹{env.PRO_PRICE_INR}</span>
            <span className="text-muted"> / month</span>
          </p>
          <Features items={PRO} />
          <div className="mt-auto pt-8">
            {!isBillingEnabled ? (
              <p className="text-sm text-muted">Billing isn&apos;t set up on this server, so every Pro feature is already on.</p>
            ) : plan === "pro" ? (
              <p className="text-sm text-muted">
                You&apos;re on Pro. Manage it in <Link href="/settings#plan" className="underline">Settings</Link>.
              </p>
            ) : (
              <UpgradeButton signedIn={Boolean(session)} />
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-12 grid gap-6 text-sm text-muted md:grid-cols-3">
        <p>
          <strong className="text-text">Cancel anytime.</strong> Pro stays on until the end of the month you&apos;ve paid for, and it won&apos;t renew.
        </p>
        <p>
          <strong className="text-text">Payments by Razorpay.</strong> UPI AutoPay, cards and netbanking. Prices are in Indian rupees.
        </p>
        <p>
          <strong className="text-text">Nothing is sent without you.</strong> Every application waits for your approval. See our{" "}
          <Link href="/refunds" className="underline">
            refund policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
