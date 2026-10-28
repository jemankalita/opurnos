import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { env } from "@/lib/env";
import { company, POLICY_UPDATED } from "@/lib/company";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={POLICY_UPDATED}>
      <p>
        These terms are an agreement between you and {company.name} (&quot;we&quot;, &quot;us&quot;) for the use of {company.site} and its services (&quot;Opurnos&quot;). By
        creating an account you accept them. If you don&apos;t agree, please don&apos;t use Opurnos.
      </p>

      <h2>What Opurnos does</h2>
      <p>
        Opurnos collects public listings for internships, jobs, hackathons, fellowships, scholarships, exams and research roles, checks them against the profile you give
        us, and helps you apply. Listings belong to their publishers. We link to the original for every listing, and we don&apos;t guarantee that a listing is accurate,
        still open, or that you&apos;ll be selected.
      </p>
      <p>
        Eligibility checks, scam warnings, pay comparisons and anything written by AI are aids, not advice. They can be wrong. Check the original listing before you rely
        on them, and never pay anyone to apply for a job or internship.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 16 to use Opurnos. If you are under 18, use it with the consent of a parent or guardian.</li>
        <li>Keep access to your email secure; sign-in links are sent there.</li>
        <li>Give us accurate information. You&apos;re responsible for what you submit, including through the apply agent.</li>
      </ul>

      <h2>Applications and the apply agent</h2>
      <p>
        Tailored materials are drafted from your resume, and each claim is checked against it. You review and approve every application before anything is submitted.
        Submitting is your decision and your responsibility. Don&apos;t use Opurnos to submit false information, to apply on someone else&apos;s behalf, or in a way that
        breaks the rules of the site you&apos;re applying through.
      </p>

      <h2>Plans and payment</h2>
      <p>
        Opurnos has a Free plan and a paid Pro plan (₹{env.PRO_PRICE_INR} per month, or the price shown on the{" "}
        <Link href="/pricing">pricing page</Link> when you subscribe). Pro renews monthly through Razorpay until you cancel. You can cancel anytime in Settings; Pro
        stays on until the end of the period you&apos;ve paid for. Refunds are covered by our <Link href="/refunds">cancellation and refund policy</Link>. If we change the
        price, we&apos;ll email you at least 14 days before it affects your next renewal.
      </p>
      <p>Each plan includes a daily allowance of AI usage and applications so the service stays fair for everyone. These limits are shown in Settings.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t scrape Opurnos, resell its data, or try to get around plan limits.</li>
        <li>Don&apos;t upload anything you don&apos;t have the right to share, or anything unlawful.</li>
        <li>Don&apos;t interfere with the service or other people&apos;s accounts.</li>
      </ul>
      <p>We may suspend accounts that break these rules. If we do, and you&apos;ve paid for Pro, we&apos;ll refund the unused part of the current period.</p>

      <h2>Your content</h2>
      <p>
        Your resume and profile stay yours. You let us use them only to run Opurnos for you, as described in our <Link href="/privacy">privacy policy</Link>. You can
        export or delete them at any time from Settings.
      </p>

      <h2>Liability</h2>
      <p>
        Opurnos is provided as is. To the extent the law allows, we aren&apos;t liable for indirect losses, missed opportunities, or decisions made by employers or
        programmes, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing here limits rights you have under the Consumer
        Protection Act, 2019 that can&apos;t be limited.
      </p>

      <h2>Changes and ending</h2>
      <p>
        We may update these terms; if the change matters, we&apos;ll email you before it takes effect. You can stop using Opurnos and delete your account whenever you
        like.
      </p>

      <h2>Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Please write to us first at <a href={`mailto:${company.email}`}>{company.email}</a>; most problems are fixed
        quickly that way. Any dispute that can&apos;t be settled will go to the courts that have jurisdiction where {company.name} is registered.
      </p>
    </LegalPage>
  );
}
