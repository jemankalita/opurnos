"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClass, Spinner } from "@/components/ui";

type Mode = "password" | "signup" | "link";
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; devLink?: string } | { kind: "error"; message: string };

const INPUT = "h-12 w-full rounded-md border border-text/30 bg-surface px-4 text-[16px] placeholder:text-faint focus:border-text focus:outline-none";

async function post(url: string, body: unknown): Promise<{ devLink?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { ok: boolean; error?: string; data?: { devLink?: string } };
  if (!json.ok) throw new Error(json.error || "Something went wrong.");
  return json.data ?? {};
}

export function LoginForm({ next, google }: { next?: string; google: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      if (mode === "password") {
        await post("/api/auth/login", { email, password });
        router.push(next || "/radar");
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const data = await post("/api/auth/signup", { name, email, password });
        if (data.devLink) {
          setState({ kind: "sent", devLink: data.devLink });
          return;
        }
        router.push(next || "/radar");
        router.refresh();
        return;
      }
      const data = await post("/api/auth/request", { email, next });
      setState({ kind: "sent", devLink: data.devLink });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't sign you in." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="mt-8 border-t border-dotted border-border-strong pt-5">
        <p className="text-sm">
          {mode === "signup" ? (
            <>
              Account created. Confirm <span className="font-medium">{email}</span> when you can. You can open your radar now.
            </>
          ) : (
            <>
              Check <span className="font-medium">{email}</span> for your sign-in link.
            </>
          )}
        </p>
        {state.devLink ? (
          <a href={state.devLink} className="mt-4 inline-flex h-10 items-center rounded-full bg-text px-5 text-sm font-medium text-bg hover:bg-text/85">
            Dev mode: open the email link →
          </a>
        ) : null}
        {mode === "signup" ? (
          <a href={next || "/radar"} className="mt-4 block text-sm underline underline-offset-4">
            Continue to your radar
          </a>
        ) : (
          <button type="button" onClick={() => setState({ kind: "idle" })} className="mt-4 text-xs text-muted underline-offset-4 hover:underline">
            Use a different email
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <div className="flex gap-4 text-sm" role="tablist" aria-label="How to sign in">
        {(
          [
            ["password", "Password"],
            ["signup", "Create account"],
            ["link", "Email link"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? "text-text underline decoration-text underline-offset-4" : "text-muted hover:text-text"}
            onClick={() => {
              setMode(id);
              setState({ kind: "idle" });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "signup" ? (
        <input className={INPUT} autoComplete="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      ) : null}
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={INPUT}
      />
      {mode !== "link" ? (
        <input
          type="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 10 : undefined}
          placeholder={mode === "signup" ? "Password, 10+ characters" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
        />
      ) : null}
      {mode === "password" ? (
        <p className="text-right text-xs">
          <Link href="/forgot" className="text-muted underline-offset-4 hover:underline">
            Forgot password
          </Link>
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? <Spinner /> : null}
        {mode === "signup" ? "Create account" : mode === "link" ? "Email me a link" : "Sign in"}
      </Button>
      {google ? (
        <a href={`/api/auth/google?next=${encodeURIComponent(next ?? "")}`} className={buttonClass("secondary", "lg", "w-full")}>
          Continue with Google
        </a>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
