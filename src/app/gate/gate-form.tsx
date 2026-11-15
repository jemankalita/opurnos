"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import type { AttemptResult, GateState } from "@/lib/portal/gate";

type View = GateState | { status: "error"; message: string; triesLeft: number };

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function messageFor(view: View, hasMissed: boolean): string | null {
  if (view.status === "locked") return `Too many wrong tries. Try again after ${clockTime(view.retryAt)}.`;
  if (view.status === "error") return view.message;
  if (!hasMissed) return null;
  return `That isn't it. ${view.triesLeft} ${view.triesLeft === 1 ? "try" : "tries"} left.`;
}

export function GateForm({ initial, maxTries, next }: { initial: GateState; maxTries: number; next: string }) {
  const [passcode, setPasscode] = useState("");
  const [view, setView] = useState<View>(initial);
  const [isChecking, setIsChecking] = useState(false);
  const triesLeft = view.status === "locked" ? 0 : view.triesLeft;
  const hasMissed = triesLeft < maxTries;

  function applyResult(result: AttemptResult) {
    switch (result.status) {
      case "ok":
        // A full load, so the proxy sees the new cookie.
        window.location.assign(next);
        return;
      case "wrong":
        setPasscode("");
        setView({ status: "open", triesLeft: result.triesLeft });
        return;
      case "locked":
        setPasscode("");
        setView({ status: "locked", retryAt: result.retryAt });
        return;
      case "unconfigured":
        setView({ status: "error", message: "The portal has no passcode set yet. Add PORTAL_PASSCODE to the server's environment.", triesLeft });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsChecking(true);
    try {
      const res = await fetch("/api/portal/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      applyResult(json.data);
    } catch (err) {
      setView({ status: "error", message: err instanceof Error ? err.message : "Couldn't check that. Try again.", triesLeft });
    } finally {
      setIsChecking(false);
    }
  }

  const isLocked = view.status === "locked";
  const message = messageFor(view, hasMissed);

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <label htmlFor="passcode" className="sr-only">
        Passcode
      </label>
      <input
        id="passcode"
        type="password"
        required
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={isLocked}
        placeholder="Passcode"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="h-12 w-full rounded-md border border-text/30 bg-surface px-4 text-[16px] placeholder:text-faint focus:border-text focus:outline-none disabled:opacity-50"
      />
      <Button type="submit" size="lg" className="w-full" disabled={isChecking || isLocked}>
        {isChecking ? <Spinner /> : null}
        Open the portal
      </Button>
      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
    </form>
  );
}
