import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "../login/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPage() {
  if (await getSession()) redirect("/settings");
  return (
    <AuthShell
      label="Password"
      title={
        <>
          Reset <em className="font-serif normal-case italic">access</em>
        </>
      }
      lead="We'll email a link that works once and expires in 30 minutes. It looks the same whether or not that address has an account."
    >
      <ForgotForm />
    </AuthShell>
  );
}
