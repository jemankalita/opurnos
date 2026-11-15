"use client";

import { useState } from "react";
import { Button, Panel, SectionLabel, Spinner } from "@/components/ui";

type Account = { email: string; hasPassword: boolean; hasGoogle: boolean; emailVerified: boolean };
type Device = { id: string; userAgent: string | null; lastSeenAt: string; isCurrent: boolean };

async function call(url: string, init?: RequestInit) {
  const json = (await fetch(url, init).then((r) => r.json())) as { ok: boolean; error?: string; data?: { devLink?: string; signedOutOthers?: number } };
  if (!json.ok) throw new Error(json.error || "Something went wrong.");
  return json.data;
}

export function AccountSecurity({ account, sessions }: { account: Account; sessions: Device[] }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState(sessions);

  async function run(id: string, task: () => Promise<void>) {
    setBusy(id);
    setError(null);
    setNote(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel className="p-5">
      <SectionLabel>Sign-in</SectionLabel>
      <p className="mt-2 text-sm text-muted">
        {account.emailVerified ? "Email confirmed." : "Email not confirmed yet. Digests still send, but confirm it so a reset link can reach you."}
        {account.hasGoogle ? " Google is linked." : ""}
      </p>
      {!account.emailVerified ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={busy === "verify"}
          onClick={() =>
            run("verify", async () => {
              const data = await call("/api/auth/resend-verification", { method: "POST" });
              setNote(data?.devLink ? `Dev mode: ${data.devLink}` : "Confirmation email sent.");
            })
          }
        >
          {busy === "verify" ? <Spinner /> : null} Send confirmation
        </Button>
      ) : null}
      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run("password", async () => {
            const data = await call("/api/auth/password", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ current, next }),
            });
            setCurrent("");
            setNext("");
            setNote(data?.signedOutOthers ? `Password saved. Signed out ${data.signedOutOthers} other device${data.signedOutOthers === 1 ? "" : "s"}.` : "Password saved.");
          });
        }}
      >
        <p className="text-sm">{account.hasPassword ? "Change password" : "Set a password"}</p>
        {account.hasPassword ? (
          <input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-10 w-full rounded-md border border-text/20 bg-surface px-3 text-sm" />
        ) : null}
        <input type="password" required minLength={10} autoComplete="new-password" placeholder="New password, 10+ characters" value={next} onChange={(e) => setNext(e.target.value)} className="h-10 w-full rounded-md border border-text/20 bg-surface px-3 text-sm" />
        <Button type="submit" size="sm" variant="secondary" disabled={busy === "password"}>
          {busy === "password" ? <Spinner /> : null} Save password
        </Button>
      </form>
      <ul className="mt-4 space-y-2">
        {devices.map((device) => (
          <li key={device.id} className="flex items-start justify-between gap-3 text-xs text-muted">
            <span>
              {device.isCurrent ? "This device" : device.userAgent || "Unknown device"}
              <span className="mt-0.5 block text-faint">Last seen {new Date(device.lastSeenAt).toLocaleString()}</span>
            </span>
            {!device.isCurrent ? (
              <button
                type="button"
                className="shrink-0 underline underline-offset-4"
                disabled={busy === device.id}
                onClick={() =>
                  run(device.id, async () => {
                    await call("/api/auth/sessions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: device.id }) });
                    setDevices((list) => list.filter((d) => d.id !== device.id));
                  })
                }
              >
                Sign out
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {devices.some((d) => !d.isCurrent) ? (
        <button
          type="button"
          className="mt-3 text-xs text-muted underline underline-offset-4"
          onClick={() =>
            run("others", async () => {
              await call("/api/auth/sessions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ others: true }) });
              setDevices((list) => list.filter((d) => d.isCurrent));
              setNote("Signed out every other device.");
            })
          }
        >
          Sign out other devices
        </button>
      ) : null}
      {note ? <p className="mt-3 break-all text-xs text-muted">{note}</p> : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
