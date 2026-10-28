"use client";

import { CalendarPlus, Check, Copy, Download, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrefsEditor } from "@/components/prefs-editor";
import { LocalTime } from "@/components/local-time";
import { Button, buttonClass, Panel, SectionLabel, Spinner } from "@/components/ui";
import type { Preferences } from "@/lib/schemas";
import type { SourceHealth } from "@/lib/source-health";
import { cn } from "@/lib/utils";
import { WatchWebsite } from "./watch-website";

type Source = {
  id: string;
  kind: string;
  label: string;
  health: SourceHealth;
  lastCount: number;
  lastError: string | null;
  lastRunAt: string | null;
  url: string | null;
  mine: boolean;
};
type Usage = { kind: string; model: string; calls: number; cost: number; tokens: number; failures: number };

type Props = {
  email: string;
  prefs: Preferences;
  resumeName: string | null;
  lastDigestAt: string | null;
  demo: boolean;
  budget: { spent: number; cap: number; applyCap: number };
  usage: Usage[];
  sources: Source[];
  calendarFeedUrl: string;
};

async function call(url: string, init?: RequestInit) {
  const json = await fetch(url, init).then((r) => r.json());
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function SettingsClient(props: Props) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <PrefsSection initial={props.prefs} />
        <WatchWebsite mySites={props.sources.flatMap((s) => (s.mine && s.url ? [{ id: s.id, label: s.label, url: s.url, lastCount: s.lastCount }] : []))} />
        <SourcesSection sources={props.sources} />
      </div>
      <aside className="space-y-6">
        <AccountSection email={props.email} resumeName={props.resumeName} />
        <DigestSection lastDigestAt={props.lastDigestAt} />
        <CalendarSection feedUrl={props.calendarFeedUrl} />
        <UsageSection demo={props.demo} budget={props.budget} usage={props.usage} />
        <DangerSection />
      </aside>
    </div>
  );
}

function PrefsSection({ initial }: { initial: Preferences }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "rescanning" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial);

  async function save() {
    setError(null);
    try {
      setState("saving");
      await call("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ prefs }) });
      setState("rescanning");
      await call("/api/match", { method: "POST" });
      setState("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setState("idle");
    }
  }

  return (
    <Panel className="p-5 sm:p-6">
      <SectionLabel>Preferences</SectionLabel>
      <div className="mt-5">
        <PrefsEditor prefs={prefs} onChange={setPrefs} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button onClick={save} disabled={!dirty || state === "saving" || state === "rescanning"}>
          {state === "saving" || state === "rescanning" ? <Spinner /> : null}
          {state === "saving" ? "Saving…" : state === "rescanning" ? "Rescanning your radar…" : "Save & rescan"}
        </Button>
        {state === "done" && !dirty ? <span className="text-sm text-eligible">Saved. Your radar is up to date.</span> : null}
        {error ? <span className="text-sm text-danger">{error}</span> : null}
        <span className="text-xs text-faint">Saved and applied items are kept.</span>
      </div>
    </Panel>
  );
}

const HEALTH: Record<SourceHealth, { dot: string; label: string; hint: string }> = {
  ok: { dot: "bg-eligible", label: "ok", hint: "" },
  running: { dot: "bg-accent animate-pulse", label: "checking", hint: "" },
  never: { dot: "bg-faint", label: "not run", hint: "" },
  empty: { dot: "bg-likely", label: "empty", hint: "Returned no listings. Seasonal programs are empty between rounds; otherwise the page layout may have changed." },
  stale: { dot: "bg-likely", label: "stale", hint: "Not checked in over a day. Is the ingest cron running?" },
  error: { dot: "bg-danger", label: "error", hint: "" },
};

function SourcesSection({ sources }: { sources: Source[] }) {
  const healthy = sources.filter((s) => s.health === "ok").length;
  const needsAttention = sources.filter((s) => s.health === "error" || s.health === "empty" || s.health === "stale");
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <SectionLabel>Sources we watch</SectionLabel>
        <span className="font-mono text-xs text-faint">
          {healthy}/{sources.length} healthy
        </span>
      </div>
      {needsAttention.length ? (
        <ul className="mt-4 space-y-2" aria-label="Sources that need attention">
          {needsAttention.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", HEALTH[s.health].dot)} />
                <span className="font-medium">{s.label}</span>
                <span className="font-mono text-[10px] uppercase text-faint">{HEALTH[s.health].label}</span>
              </span>
              <p className="mt-1 break-words font-mono text-xs text-muted">{s.lastError ?? HEALTH[s.health].hint}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="scrollbar-thin mt-4 max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-xs text-faint">
            <tr>
              <th className="py-2 font-normal">Source</th>
              <th className="py-2 font-normal">Listings</th>
              <th className="hidden py-2 font-normal sm:table-cell">Last checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map((s) => (
              <tr key={s.id} title={s.lastError ?? undefined}>
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-1.5 shrink-0 rounded-full", HEALTH[s.health].dot)} aria-label={HEALTH[s.health].label} />
                    <span className="truncate">{s.label}</span>
                    <span className="font-mono text-[10px] uppercase text-faint">{s.kind}</span>
                  </span>
                </td>
                <td className="py-2.5 font-mono text-xs tabular text-muted">{s.health === "error" ? <span className="text-danger">error</span> : s.lastCount}</td>
                <td className="hidden py-2.5 font-mono text-xs text-faint sm:table-cell">{s.lastRunAt ? <LocalTime value={s.lastRunAt} /> : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sources.length ? <p className="py-6 text-center text-sm text-muted">No scans yet. Your first rescan pulls every source.</p> : null}
      </div>
    </Panel>
  );
}

function AccountSection({ email, resumeName }: { email: string; resumeName: string | null }) {
  return (
    <Panel className="p-5">
      <SectionLabel>Account</SectionLabel>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-faint">Email</dt>
        <dd className="truncate">{email}</dd>
        <dt className="text-faint">Resume</dt>
        <dd className="truncate">{resumeName ?? "Pasted text"}</dd>
      </dl>
      <Link href="/start" className="mt-4 inline-block text-sm underline underline-offset-4 hover:decoration-2">
        Replace resume or edit profile →
      </Link>
    </Panel>
  );
}

function DigestSection({ lastDigestAt }: { lastDigestAt: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | string>("idle");
  async function send() {
    setState("sending");
    try {
      const r = await call("/api/digest", { method: "POST" });
      setState(r.sent ? `Sent ${r.count} picks to your inbox.` : "Nothing new to send right now.");
    } catch (err) {
      setState(err instanceof Error ? err.message : "Couldn't send.");
    }
  }
  return (
    <Panel className="p-5">
      <SectionLabel>Email digest</SectionLabel>
      <p className="mt-2 text-sm text-muted">Last sent {lastDigestAt ? <LocalTime value={lastDigestAt} /> : "never"}. Choose daily or weekly in preferences.</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={send} disabled={state === "sending"}>
        {state === "sending" ? <Spinner /> : <Mail className="size-4" />} Send my digest now
      </Button>
      {state !== "idle" && state !== "sending" ? <p className="mt-2 text-xs text-muted">{state}</p> : null}
    </Panel>
  );
}

function CalendarSection({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  return (
    <Panel className="p-5">
      <SectionLabel>Deadlines in your calendar</SectionLabel>
      <p className="mt-2 text-sm text-muted">
        Everything you save or start applying to shows up in your calendar at its deadline, with a reminder the day before. It stays in sync on its own.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={google} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
          <CalendarPlus className="size-4" /> Google Calendar
        </a>
        <a href={webcal} className={buttonClass("ghost", "sm")}>
          Apple / Outlook
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(feedUrl).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-faint">The link is private to you: anyone who has it can see your saved deadlines.</p>
    </Panel>
  );
}

function UsageSection({ demo, budget, usage }: Pick<Props, "demo" | "budget" | "usage">) {
  const pct = Math.min(100, (budget.spent / budget.cap) * 100);
  return (
    <Panel className="p-5">
      <SectionLabel>AI usage</SectionLabel>
      {demo ? <p className="mt-2 rounded-md border border-text/25 bg-elevated px-3 py-2 text-xs">Demo mode: no model key is set, so rules and heuristics stand in for Muse Spark.</p> : null}
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="text-muted">Today</span>
        <span className="font-mono tabular">
          ${budget.spent.toFixed(3)} / ${budget.cap.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-faint">Up to {budget.applyCap} agent applications per day.</p>
      {usage.length ? (
        <table className="mt-4 w-full text-xs">
          <thead className="text-left text-faint">
            <tr>
              <th className="pb-1.5 font-normal">Last 30 days</th>
              <th className="pb-1.5 text-right font-normal">Calls</th>
              <th className="pb-1.5 text-right font-normal">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usage.map((u) => (
              <tr key={`${u.kind}-${u.model}`}>
                <td className="py-1.5">
                  {u.kind} <span className="font-mono text-faint">{u.model}</span>
                </td>
                <td className="py-1.5 text-right font-mono tabular">
                  {u.calls}
                  {u.failures ? <span className="text-danger"> ({u.failures}✕)</span> : null}
                </td>
                <td className="py-1.5 text-right font-mono tabular">${u.cost.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Panel>
  );
}

function DangerSection() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    const data = await call("/api/account");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "opurnos-export.json" });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    setBusy(true);
    try {
      await call("/api/account", { method: "DELETE" });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
      setBusy(false);
    }
  }

  return (
    <Panel className="p-5">
      <SectionLabel>Your data</SectionLabel>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => void exportData().catch((e) => setError(String(e)))}>
        <Download className="size-4" /> Export everything (JSON)
      </Button>
      <div className="mt-5 border-t border-border pt-4">
        <label className="text-xs text-muted" htmlFor="delete-confirm">
          Type <span className="font-mono text-text">delete</span> to erase your account, resume, matches and applications.
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="delete-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-transparent px-3 text-sm focus:border-danger/60 focus:outline-none"
          />
          <Button variant="danger" size="sm" disabled={confirm !== "delete" || busy} onClick={remove}>
            {busy ? <Spinner /> : <Trash2 className="size-4" />} Delete
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      </div>
    </Panel>
  );
}
