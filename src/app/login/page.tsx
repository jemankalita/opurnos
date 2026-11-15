import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/auth-redirect";
import { isGoogleAuthEnabled } from "@/lib/env";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTES: Record<string, string> = {
  expired: "That link expired or was already used. Request a new one.",
  verify: "That confirmation link expired or was already used.",
  google: "Google sign-in didn't finish. Try again, or use your email.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; verified?: string }> }) {
  const { next, error, verified } = await searchParams;
  const dest = safeNext(next, "");
  if (await getSession()) redirect(dest || "/radar");
  return (
    <AuthShell
      label="Sign in"
      title={
        <>
          Open <em className="font-serif normal-case italic">your</em> radar
        </>
      }
      lead="Use a password, create an account, or get a one-time email link."
    >
      {verified ? <p className="mt-6 border-l-2 border-eligible pl-3 text-sm">Email confirmed. Sign in to continue.</p> : null}
      {error ? (
        <p role="alert" className="mt-6 border-l-2 border-danger pl-3 text-sm text-danger">
          {NOTES[error] ?? "Something went wrong. Try again."}
        </p>
      ) : null}
      <LoginForm next={dest || undefined} google={isGoogleAuthEnabled} />
    </AuthShell>
  );
}
