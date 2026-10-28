import type { Metadata } from "next";
import { Panel } from "@/components/ui";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="max-w-[70ch]">
      <p className="label">Contact</p>
      <h1 className="mt-3 font-display text-[40px] leading-[0.95] uppercase md:text-[52px]">Talk to a person</h1>
      <p className="mt-4 text-[17px] text-muted">
        Questions, billing, refunds, a listing that looks wrong, or a privacy request: write to us and a person will reply within 2 working days.
      </p>
      <Panel className="mt-10 space-y-4 p-6 text-[15px]">
        <p>
          <span className="label block">Email</span>
          <a href={`mailto:${company.email}`} className="underline">
            {company.email}
          </a>
        </p>
        <p>
          <span className="label block">Business</span>
          {company.name}
          {company.address ? <span className="block text-muted">{company.address}</span> : null}
        </p>
        <p>
          <span className="label block">Grievance officer</span>
          {company.grievanceOfficer ?? "Reachable at the email above"}. We acknowledge complaints within 48 hours and resolve them within 30 days.
        </p>
      </Panel>
      <p className="mt-6 text-sm text-faint">
        Spotted a listing that asks for money? Don&apos;t pay. Report it to us, and at cybercrime.gov.in or by calling 1930.
      </p>
    </div>
  );
}
