import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { company, POLICY_UPDATED } from "@/lib/company";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_UPDATED}>
      <p>
        This policy explains what personal data {company.name} collects, why, who it is shared with, and the rights you have under India&apos;s Digital Personal Data
        Protection Act, 2023. We collect only what we need to find opportunities for you and help you apply.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address.
        </li>
        <li>
          <strong>Resume and profile:</strong> the resume you upload (the PDF and its text), what we read from it (education, skills, experience, projects), and details
          you add such as marks, backlogs, GATE score and preferences.
        </li>
        <li>
          <strong>Activity:</strong> which listings you save, dismiss or apply to, applications you draft, and for the apply agent, screenshots of the application
          forms it fills.
        </li>
        <li>
          <strong>Payments:</strong> if you subscribe to Pro, your Razorpay subscription id and its status. Card, UPI and bank details go directly to Razorpay; we never
          see or store them.
        </li>
        <li>
          <strong>Technical:</strong> a sign-in cookie, and logs of AI usage (counts and costs) needed to run plan limits.
        </li>
      </ul>
      <p>We don&apos;t use advertising trackers and we don&apos;t sell personal data.</p>

      <h2>Why we use it</h2>
      <p>
        To match listings to you, check eligibility, send the digests you ask for, draft and verify applications, fill forms you approve, bill Pro, keep the service
        secure, and answer you when you write to us. We process your data on the basis of the consent you give when you create an account and upload your resume, and
        for the legitimate uses the Act allows.
      </p>

      <h2>Who processes it for us</h2>
      <ul>
        <li>
          <strong>OpenAI</strong> (United States): reads your resume and the listings to judge eligibility, tailor materials and draft referral requests. Under its API
          terms, OpenAI does not use this data to train its models. Listing text with no personal data in it is processed by a cheaper model.
        </li>
        <li>
          <strong>Resend</strong>: sends sign-in links and digests to your email.
        </li>
        <li>
          <strong>Razorpay</strong>: takes payments for Pro.
        </li>
        <li>
          <strong>Our hosting and database providers</strong>: store and run Opurnos.
        </li>
      </ul>
      <p>
        When you approve an application, the information you approved is submitted to the employer or programme you chose; their own privacy policy applies from then
        on. Some processors are outside India; we transfer data only to countries the Government of India hasn&apos;t restricted.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account exists. When you delete your account in Settings, your profile, resume, matches, applications, screenshots and usage logs
        are deleted at once; copies in backups are overwritten within 30 days. We keep the payment records tax law requires, for as long as it requires.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>See and download your data: Settings → Export my data.</li>
        <li>Correct it: edit your profile and preferences, or upload a new resume.</li>
        <li>Erase it: Settings → Delete account. This also cancels any Pro subscription.</li>
        <li>Withdraw consent: deleting your account withdraws it; it doesn&apos;t affect processing that happened before.</li>
        <li>Nominate someone to exercise these rights if you die or can&apos;t act, by writing to us.</li>
        <li>Complain to us, and if we don&apos;t resolve it, to the Data Protection Board of India.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access is limited to what running the service needs, and sign-in uses one-time email links instead of passwords. If a breach
        affects your data, we&apos;ll tell you and the Data Protection Board as the Act requires.
      </p>

      <h2>Children</h2>
      <p>
        Opurnos is for students and graduates aged 16 and over. If you are under 18, we need verifiable consent from a parent or guardian; please have them write to us
        before you upload a resume.
      </p>

      <h2>Grievance officer</h2>
      <p>
        {company.grievanceOfficer ? <>{company.grievanceOfficer}, </> : null}
        <a href={`mailto:${company.email}`}>{company.email}</a>
        {company.address ? <>, {company.address}</> : null}. We acknowledge complaints within 48 hours and resolve them within 30 days. See also our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
