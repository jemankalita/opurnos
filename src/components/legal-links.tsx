import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/pricing", "Pricing"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/refunds", "Cancellation & refunds"],
  ["/contact", "Contact"],
] as const;

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted", className)}>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className="hover:text-text">
          {label}
        </Link>
      ))}
    </nav>
  );
}
