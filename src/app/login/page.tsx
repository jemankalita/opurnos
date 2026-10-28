import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { Art } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const SKY_STAMP = { "--stamp": "var(--sky)", "--hole": "color-mix(in oklab, var(--sky) 45%, var(--bg))" } as CSSProperties;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect(next?.startsWith("/") ? next : "/radar");
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="my-auto w-full max-w-sm py-16">
          <p className="label">Sign in</p>
          <h1 className="mt-4 font-display text-[44px] leading-[0.95] uppercase">
            Open <em className="font-serif normal-case italic">your</em> radar
          </h1>
          <p className="mt-4 text-[16px] text-muted">We&apos;ll email you a one-time link. No password to remember.</p>
          {error ? (
            <p role="alert" className="mt-6 border-l-2 border-danger pl-3 text-sm text-danger">
              {error === "expired" ? "That link expired or was already used. Request a new one." : "Something went wrong. Try again."}
            </p>
          ) : null}
          <LoginForm next={next?.startsWith("/") ? next : undefined} />
        </div>
        <p className="text-[13px] text-faint">
          Your resume stays yours. Nothing is submitted anywhere without your approval. By signing in you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <div className="hidden items-center justify-center bg-sky/45 lg:flex">
        <div className="stamp h-[460px] w-[340px]" style={SKY_STAMP}>
          <div className="stamp-face flex flex-col p-5 text-[#140d0d]">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Opurnos · Lighthouse</span>
            <Art name="lighthouse" className="mt-4 flex-1" />
            <span className="mt-4 text-center font-display text-[22px] uppercase">
              A light <em className="font-serif normal-case italic">left on</em>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
