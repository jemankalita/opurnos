import type { Metadata } from "next";
import { AuthShell } from "../login/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <AuthShell
      label="Password"
      title={
        <>
          Choose a <em className="font-serif normal-case italic">new</em> one
        </>
      }
      lead="This signs you out on every other device. Use at least 10 characters."
    >
      <ResetForm token={t ?? ""} />
    </AuthShell>
  );
}
