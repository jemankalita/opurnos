"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@/components/ui";

const INPUT = "h-12 w-full rounded-md border border-text/30 bg-surface px-4 text-[16px] placeholder:text-faint focus:border-text focus:outline-none";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devLink, setDevLink] = useState<string | undefined>();
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { devLink?: string } };
      if (!json.ok) throw new Error(json.error || "Couldn't send the link.");
      setDevLink(json.data?.devLink);
      setState("sent");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't send the link.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-8 border-t border-dotted border-border-strong pt-5">
        <p className="text-sm">
          If <span className="font-medium">{email}</span> has an account, a reset link is on its way.
        </p>
        {devLink ? (
          <a href={devLink} className="mt-4 inline-flex h-10 items-center rounded-full bg-text px-5 text-sm font-medium text-bg hover:bg-text/85">
            Dev mode: open the reset link →
          </a>
        ) : null}
        <Link href="/login" className="mt-4 block text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input id="email" type="email" required autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? <Spinner /> : null}
        Send reset link
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
      <Link href="/login" className="block text-sm text-muted underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
