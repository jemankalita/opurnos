import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company, POLICY_UPDATED } from "@/lib/company";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Cancellation and Refund Policy" };

const REFUND_DAYS = 7;

export default function RefundsPage() {
  return (
    <LegalPage title="Cancellation & Refunds" updated={POLICY_UPDATED}>
      <p>Opurnos Pro costs ₹{env.PRO_PRICE_INR} a month and renews automatically through Razorpay. Opurnos is a digital service; nothing is shipped.</p>

      <h2>Cancelling</h2>
      <ul>
        <li>Cancel anytime in Settings → Plan → Cancel subscription. You can also cancel the mandate from your UPI app or bank.</li>
        <li>Pro stays on until the end of the period you&apos;ve already paid for, then your account moves to Free. Nothing more is charged.</li>
        <li>Your data stays on Free; nothing is deleted when you cancel.</li>
      </ul>

      <h2>Refunds</h2>
      <ul>
        <li>
          <strong>First payment:</strong> if Pro isn&apos;t for you, ask within {REFUND_DAYS} days of your first payment and we&apos;ll refund it in full.
        </li>
        <li>
          <strong>Charged after cancelling, or charged twice:</strong> we refund the charge in full.
        </li>
        <li>
          <strong>Service unavailable:</strong> if Pro features were unavailable for most of a billing period because of a fault on our side, we refund that period.
        </li>
        <li>Otherwise, renewals already paid aren&apos;t refunded, but cancelling stops the next one.</li>
      </ul>

      <h2>How refunds are paid</h2>
      <p>
        Write to <a href={`mailto:${company.email}`}>{company.email}</a> from your account&apos;s email with the date of the charge. We reply within 2 working days.
        Approved refunds go back to the original payment method through Razorpay and usually arrive within 5–7 working days, depending on your bank.
      </p>
    </LegalPage>
  );
}
