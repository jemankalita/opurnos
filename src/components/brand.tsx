import Link from "next/link";
import { cn } from "@/lib/utils";

/** A postmark: the ring of a franking stamp and its wavy cancellation lines. Opurnos mails you what matters. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={cn("h-6 w-8", className)} aria-hidden fill="none" stroke="currentColor">
      <circle cx="10" cy="12" r="8.25" strokeWidth="1.6" />
      <circle cx="10" cy="12" r="3" strokeWidth="1.6" />
      <path d="M17.5 7.5c1.6-1.2 3.1-1.2 4.7 0s3.1 1.2 4.7 0 2.4-.9 3.1-.6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.6 12c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 2-.8 2.4-.6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17.5 16.5c1.6-1.2 3.1-1.2 4.7 0s3.1 1.2 4.7 0 2.4-.9 3.1-.6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-text", className)} aria-label="Opurnos home">
      <LogoMark />
      <span className="font-display text-[23px] leading-none tracking-[-0.01em]">Opurnos</span>
    </Link>
  );
}
