import { AppNav } from "@/components/app-nav";
import { LegalLinks } from "@/components/legal-links";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <div className="min-h-dvh">
      <AppNav email={session.email} demo={isDemoMode} />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-12 pt-8 md:px-8 md:pb-16 md:pt-12">{children}</main>
      <footer className="mx-auto w-full max-w-[1240px] border-t border-dotted border-border-strong px-4 pt-5 pb-28 md:px-8 md:pb-8">
        <LegalLinks />
      </footer>
    </div>
  );
}
