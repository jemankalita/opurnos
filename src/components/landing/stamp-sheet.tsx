"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { ArtName } from "@/components/ui";
import { cn, TYPE_LABEL } from "@/lib/utils";
import { Stamp, type StampTone } from "./stamp";

export type SheetItem = { id: string; title: string; org: string; due: string; remote: boolean };
export type SheetKind = { type: string; art: ArtName; tone: StampTone; count: number; items: SheetItem[] };

// Fanned like stamps laid out on a desk: tilt and drop grow toward the edges.
function fan(i: number, n: number) {
  const t = n > 1 ? i / (n - 1) - 0.5 : 0;
  return { rotate: t * 22, drop: t * t * 110 };
}

/** The live part of the landing page: every stamp is today's count; pick one to see what closes next. */
export function StampSheet({ kinds }: { kinds: SheetKind[] }) {
  const [picked, setPicked] = useState(kinds.find((k) => k.items.length)?.type ?? kinds[0]?.type);
  const current = kinds.find((k) => k.type === picked) ?? kinds[0];

  return (
    <div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-4 pb-6 scrollbar-thin md:-mx-8 md:px-8 lg:mx-0 lg:h-[270px] lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0 lg:pt-8">
        {kinds.map((k, i) => {
          const { rotate, drop } = fan(i, kinds.length);
          const on = k.type === current?.type;
          return (
            <button
              key={k.type}
              type="button"
              onClick={() => setPicked(k.type)}
              aria-pressed={on}
              aria-label={`${TYPE_LABEL[k.type] ?? k.type}: ${k.count} open`}
              className="group shrink-0 snap-center rounded-sm outline-none lg:mx-0.5"
              style={{ "--r": `${rotate}deg`, "--y": `${drop}px` } as CSSProperties}
            >
              <span className={cn("fan block", on && "fan-on")}>
                <Stamp
                  art={k.art}
                  tone={k.tone}
                  name={TYPE_LABEL[k.type] ?? k.type}
                  count={`${k.count.toLocaleString("en-US")} open`}
                  className={cn(
                    "h-[184px] w-[142px] lg:h-[172px] lg:w-[132px] xl:h-[184px] xl:w-[142px] group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-text",
                    
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>

      {current ? <Closing kind={current} /> : null}
    </div>
  );
}

function Closing({ kind }: { kind: SheetKind }) {
  const name = TYPE_LABEL[kind.type] ?? kind.type;
  return (
    <div className="mx-auto mt-2 max-w-3xl" aria-live="polite">
      <p className="text-center text-[16px] text-muted">
        {kind.items.length
          ? `${name}s closing soonest, from today's sweep`
          : `No open ${name.toLowerCase()}s in today's sweep. The web scout looks for them every morning.`}
      </p>
      {kind.items.length ? (
        <ul className="mt-6 border-b border-dotted border-border-strong">
          {kind.items.map((it) => (
            <li key={it.id} className="border-t border-dotted border-border-strong">
              <Link href="/login" className="group flex items-baseline gap-4 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[21px] leading-snug decoration-1 underline-offset-4 group-hover:underline">{it.title}</span>
                  <span className="mt-0.5 block text-[15px] text-muted">
                    {it.org}
                    {it.remote ? " · Remote" : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[13px] text-signal tabular">{it.due}</span>
                <ArrowRight className="size-4 shrink-0 self-center text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
