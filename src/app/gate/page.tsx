import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { Logo } from "@/components/brand";
import { Art } from "@/components/ui";
import { gateState, LOCK_MINUTES, MAX_TRIES, visitorKey } from "@/lib/portal/gate";
import { safeNextPath } from "@/lib/portal/gate-token";
import { GateForm } from "./gate-form";

export const metadata: Metadata = { title: "Private portal", robots: { index: false, follow: false } };

const SAGE_STAMP = { "--stamp": "var(--sage)", "--hole": "color-mix(in oklab, var(--sage) 45%, var(--bg))" } as CSSProperties;

export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const state = await gateState(visitorKey(await headers()));
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo href="/gate" />
        <div className="my-auto w-full max-w-sm py-16">
          <p className="label">Private portal</p>
          <h1 className="mt-4 font-display text-[44px] leading-[0.95] uppercase">
            Enter <em className="font-serif normal-case italic">the</em> passcode
          </h1>
          <p className="mt-4 text-[16px] text-muted">
            You get {MAX_TRIES} tries. After that the gate stays shut for {LOCK_MINUTES} minutes.
          </p>
          <GateForm initial={state} maxTries={MAX_TRIES} next={safeNextPath(next)} />
        </div>
      </div>
      <div className="hidden items-center justify-center bg-sage/45 lg:flex">
        <div className="stamp h-[460px] w-[340px]" style={SAGE_STAMP}>
          <div className="stamp-face flex flex-col p-5 text-[#140d0d]">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Opurnos · Compass</span>
            <Art name="compass" className="mt-4 flex-1" />
            <span className="mt-4 text-center font-display text-[22px] uppercase">
              Start <em className="font-serif normal-case italic">early</em>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
