"use client";

import { KanbanSquare, LogOut, Moon, Radar as RadarIcon, Settings, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Logo } from "./brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/radar", label: "Radar", icon: RadarIcon },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/start", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme === "dark", () => false);
  function toggle() {
    const next = !dark;
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("opurnos-theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-text", className)}
      aria-label={dark ? "Switch to paper theme" : "Switch to ink theme"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function AppNav({ email, demo }: { email: string; demo: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-6 px-4 md:px-8">
          <Logo href="/radar" />
          <nav className="ml-6 hidden items-center gap-7 md:flex" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative py-1 text-[15px] transition-colors",
                  active(href) ? "text-text after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-text" : "text-muted hover:text-text",
                )}
                aria-current={active(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {demo ? (
              <span className="mr-2 hidden font-mono text-[11px] uppercase tracking-[0.1em] text-label lg:inline" title="Agents use built-in rules until an OpenAI API key is set.">
                Rules-only
              </span>
            ) : null}
            <span className="mr-1 hidden max-w-[180px] truncate text-[13px] text-faint lg:inline" title={email}>
              {email}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-text"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <div className="rule-dotted" />
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 bg-bg pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        <div className="rule-dotted col-span-4" />
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active(href) ? "text-text" : "text-faint")}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon className="size-5" strokeWidth={active(href) ? 2 : 1.6} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
