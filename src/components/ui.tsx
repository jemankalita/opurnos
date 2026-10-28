import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn, deadlineLabel, daysUntil, TYPE_LABEL, VERDICT_LABEL } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,color,border,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 select-none";
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/85",
  secondary: "border border-text/75 text-text hover:bg-text hover:text-bg",
  ghost: "text-muted hover:text-text hover:bg-accent-soft",
  danger: "border border-danger/60 text-danger hover:bg-danger hover:text-bg",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// Verdicts are printed as flat tints from the stamp palette, with the deep tone for the words.
const VERDICT_STYLE: Record<string, string> = {
  eligible: "text-eligible bg-sage/40",
  likely: "text-likely bg-peri/40",
  stretch: "text-stretch bg-clay/40",
  ineligible: "text-ineligible bg-sand",
};

export function VerdictPill({ verdict, className }: { verdict: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium", VERDICT_STYLE[verdict], className)}>
      {VERDICT_LABEL[verdict] ?? verdict}
    </span>
  );
}

export function TypePill({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-label", className)}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

export function Deadline({ deadline, className }: { deadline: Date | string | null; className?: string }) {
  const days = daysUntil(deadline);
  const urgent = days !== null && days >= 0 && days <= 7;
  return (
    <span className={cn("font-mono text-xs tabular", urgent ? "text-signal" : "text-muted", className)}>
      {deadlineLabel(deadline)}
    </span>
  );
}

/** 0–100 match score: a serif figure inside a fine arc. Colour follows the verdict so mark and chip agree. */
export function ScoreRing({ score, verdict = "likely", size = 40 }: { score: number; verdict?: string; size?: number }) {
  const stroke = 1.5;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const color = `var(--${verdict === "ineligible" ? "ineligible" : verdict})`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Match score ${score} of 100`} role="img">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke * 1.6}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-serif tabular" style={{ fontSize: Math.round(size * 0.4) }}>
        {score}
      </span>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border-strong bg-surface px-1 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-md border border-border bg-surface", className)} {...props} />;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("label", className)}>{children}</h2>;
}

/** A dithered museum print, inked in the current text colour (see .dither in globals.css). */
export function Art({ name, className, label }: { name: ArtName; className?: string; label?: string }) {
  return (
    <span
      className={cn("dither", className)}
      style={{ "--art": `url(/art/${name}.png)` } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export type ArtName = "clock" | "hand" | "inkwell" | "microscope" | "divider" | "compass" | "coin" | "lighthouse";

export function EmptyState({ title, body, action, art = "lighthouse" }: { title: string; body: ReactNode; action?: ReactNode; art?: ArtName }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md bg-elevated/60 px-6 py-14 text-center">
      <Art name={art} className="mb-6 h-28 w-24 text-text/80" />
      <h3 className="font-serif text-[28px] leading-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-[15px] text-pretty text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function OrgAvatar({ org, logo, size = 36 }: { org: string; logo?: string | null; size?: number }) {
  const initials = org
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-elevated font-serif text-[13px] text-muted"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote logos from many hosts; no layout shift (fixed box)
        <img src={logo} alt="" className="size-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
      role="status"
      aria-label="Loading"
    />
  );
}
