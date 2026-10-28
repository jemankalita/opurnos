"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; devLink?: string } | { kind: "error"; message: string };

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setState({ kind: "sent", devLink: json.data.devLink });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't send the link." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="mt-8 border-t border-dotted border-border-strong pt-5">
        <p className="text-sm">
          Check <span className="font-medium">{email}</span> for your sign-in link.
        </p>
        {state.devLink ? (
          <a href={state.devLink} className="mt-4 inline-flex h-10 items-center rounded-full bg-text px-5 text-sm font-medium text-bg hover:bg-text/85">
            Dev mode: no email provider configured. Continue →
          </a>
        ) : null}
        <button type="button" onClick={() => setState({ kind: "idle" })} className="mt-4 text-xs text-muted underline-offset-4 hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        placeholder="you@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 w-full rounded-md border border-text/30 bg-surface px-4 text-[16px] placeholder:text-faint focus:border-text focus:outline-none"
      />
      <Button type="submit" size="lg" className="w-full" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? <Spinner /> : null}
        Email me a link
      </Button>
      {state.kind === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
