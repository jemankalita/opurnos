import type { CSSProperties, ReactNode } from "react";
import { Art, type ArtName } from "@/components/ui";
import { cn } from "@/lib/utils";

export type StampTone = "peri" | "sage" | "clay" | "sky" | "sand";

/** One kind of opportunity as a postage stamp: a dithered museum print, its name, and a live count down the edge. */
export function Stamp({
  art,
  tone,
  name,
  count,
  className,
}: {
  art: ArtName;
  tone: StampTone;
  name: string;
  count: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("stamp block", className)} style={{ "--stamp": `var(--${tone})` } as CSSProperties}>
      <span className="stamp-face flex flex-col p-2.5 pr-5 text-[#140d0d]">
        <span className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.08em]">{name}</span>
        <span className="relative mt-3 mb-3 flex-1">
          <Art name={art} className="absolute inset-x-1 inset-y-0" />
        </span>
        <span className="absolute right-1.5 bottom-2.5 font-mono text-[10px] leading-none tabular [writing-mode:vertical-rl]">{count}</span>
      </span>
    </span>
  );
}

/** A circular postmark with the date of the sweep, struck across a corner like a real cancellation. */
export function Postmark({ lines, className }: { lines: [string, string]; className?: string }) {
  const mono = "var(--font-mono), monospace";
  return (
    <svg viewBox="0 0 200 120" className={cn("pointer-events-none", className)} aria-hidden fill="none" stroke="currentColor">
      <defs>
        <path id="pm-ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="54" strokeWidth="2.2" />
      <circle cx="60" cy="60" r="34" strokeWidth="1.4" />
      <text fontSize="10.5" letterSpacing="2.4" fill="currentColor" stroke="none" fontFamily={mono}>
        <textPath href="#pm-ring">OPURNOS · DAILY SWEEP · OPURNOS ·</textPath>
      </text>
      <text x="60" y="57" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" fontFamily={mono}>
        {lines[0]}
      </text>
      <text x="60" y="72" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" fontFamily={mono}>
        {lines[1]}
      </text>
      {[38, 60, 82].map((y) => (
        <path key={y} d={`M122 ${y} c10 -8 18 -8 26 0 s16 8 26 0 s14 -6 22 -2`} strokeWidth="2.2" strokeLinecap="round" />
      ))}
    </svg>
  );
}
