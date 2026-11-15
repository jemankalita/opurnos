"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";

const INPUT = "h-12 w-full rounded-md border border-text/30 bg-surface px-4 text-[16px] placeholder:text-faint focus:border-text focus:outline-none";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMessage("This page needs the link from your email.");
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Couldn't reset the password.");
      router.push("/radar");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't reset the password.");
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <label htmlFor="password" className="sr-only">
        New password
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={INPUT}
      />
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending" || !token}>
        {state === "sending" ? <Spinner /> : null}
        Save password and sign in
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {message}{" "}
          <Link href="/forgot" className="underline">
            Ask for a new link
          </Link>
        </p>
      ) : null}
    </form>
  );
}
