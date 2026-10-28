import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <div className="min-h-dvh">
      <AppNav email={session.email} demo={isDemoMode} />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 md:px-8 md:pb-16 md:pt-12">{children}</main>
    </div>
  );
}
