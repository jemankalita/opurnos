import Link from "next/link";
import { Logo } from "@/components/brand";
import { LegalLinks } from "@/components/legal-links";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-dotted border-border-strong">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between px-4 py-4 md:px-8">
          <Logo />
          <Link href={session ? "/radar" : "/login"} className="text-sm text-muted hover:text-text">
            {session ? "Open your radar" : "Sign in"}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-12 md:px-8 md:py-16">{children}</main>
      <footer className="border-t border-dotted border-border-strong">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-3 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <LegalLinks />
          <p className="text-[13px] text-faint">
            © {new Date().getFullYear()} {env.COMPANY_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
