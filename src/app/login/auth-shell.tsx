import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Art } from "@/components/ui";

const SKY_STAMP = { "--stamp": "var(--sky)", "--hole": "color-mix(in oklab, var(--sky) 45%, var(--bg))" } as CSSProperties;

export function AuthShell({
  label,
  title,
  lead,
  children,
}: {
  label: string;
  title: ReactNode;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="my-auto w-full max-w-sm py-16">
          <p className="label">{label}</p>
          <h1 className="mt-4 font-display text-[44px] leading-[0.95] uppercase">{title}</h1>
          <p className="mt-4 text-[16px] text-muted">{lead}</p>
          {children}
        </div>
        <p className="text-[13px] text-faint">
          Your resume stays yours. Nothing is submitted anywhere without your approval. By continuing you agree to our{" "}
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
