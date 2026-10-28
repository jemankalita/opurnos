"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Bot, Check, CheckCircle2, Copy, ExternalLink, Eye, Hand, MousePointerClick, ShieldCheck, Terminal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Button, buttonClass, Panel, SectionLabel, Spinner } from "@/components/ui";
import type { ApplicationState, ClaimCheck, Tailored, VerifierReport } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Step = { seq: number; kind: string; message: string; screenshot: string | null; at: string };
type View = {
  state: ApplicationState;
  error: string | null;
  tailored: Tailored | null;
  verifier: VerifierReport | null;
  acceptedClaims: string[];
  fields: { label: string; value: string }[];
  submittedAt: string | null;
  agentSupported: boolean;
};

const BUSY: ApplicationState[] = ["drafting", "queued", "filling", "submitting"];
const STAGES = [
  { key: "materials", label: "Materials", states: ["drafting", "review_materials"] },
  { key: "agent", label: "Agent fills", states: ["queued", "filling"] },
  { key: "review", label: "Review & submit", states: ["awaiting_approval", "submitting", "submitted", "handoff"] },
] as const;

export function ApplyStudio({ applicationId, applyUrl, host }: { applicationId: string; applyUrl: string; host: string }) {
  const [view, setView] = useState<View | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastSeq = useRef(0);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/apply/${applicationId}?after=${lastSeq.current}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error);
      return null;
    }
    const { steps: fresh, ...rest } = json.data as View & { steps: Step[] };
    if (fresh.length) {
      lastSeq.current = fresh[fresh.length - 1].seq;
      setSteps((prev) => [...prev, ...fresh]);
    }
    setView(rest);
    return rest.state;
  }, [applicationId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = async () => {
      const state = await poll().catch(() => null);
      if (!alive) return;
      timer = setTimeout(loop, state && BUSY.includes(state) ? 1200 : 6000);
    };
    void loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [poll]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const json = await fetch(`/api/apply/${applicationId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
      await poll();
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  if (!view) {
    return (
      <div className="mt-10 space-y-4">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-80 w-full" />
      </div>
    );
  }

  const stageIndex = STAGES.findIndex((s) => (s.states as readonly string[]).includes(view.state));
  const latestShot = [...steps].reverse().find((s) => s.screenshot)?.screenshot ?? null;

  return (
    <div className="mt-8">
      <ol className="grid grid-cols-3 gap-2" aria-label="Application progress">
        {STAGES.map((s, i) => {
          const done = stageIndex > i || view.state === "submitted";
          const current = stageIndex === i && view.state !== "submitted";
          return (
            <li key={s.key} className="relative">
              <div className={cn("h-1 rounded-full", done ? "bg-eligible" : current ? "bg-accent" : "bg-border")}>
                {current && BUSY.includes(view.state) ? (
                  <motion.div className="h-full w-1/3 rounded-full bg-white/50" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
                ) : null}
              </div>
              <div className={cn("mt-2 text-xs sm:text-sm", current ? "text-text" : done ? "text-muted" : "text-faint")}>
                <span className="font-mono text-faint">{i + 1}</span> {s.label}
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div key={stageKey(view.state)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {view.state === "drafting" && <Working title="Tailoring your materials" body="Muse Spark is drafting from your resume, then a separate verifier checks every claim." steps={steps} />}
            {view.state === "review_materials" && view.tailored && view.verifier && (
              <Materials view={view as View & { tailored: Tailored; verifier: VerifierReport }} busy={busy} host={host} onSave={(t) => act({ action: "save", tailored: t })} onApprove={(c) => act({ action: "approve", acceptedClaims: c })} />
            )}
            {(view.state === "queued" || view.state === "filling") && <AgentView shot={latestShot} steps={steps} host={host} live />}
            {view.state === "awaiting_approval" && (
              <Review
                view={view}
                shot={latestShot}
                steps={steps}
                host={host}
                busy={busy}
                onSubmit={() => act({ action: "submit" })}
                onCancel={() => act({ action: "cancel" })}
              />
            )}
            {view.state === "submitting" && <AgentView shot={latestShot} steps={steps} host={host} live title="Submitting…" />}
            {view.state === "handoff" && <Handoff view={view} applyUrl={applyUrl} busy={busy} onManual={() => act({ action: "manual" })} />}
            {view.state === "submitted" && <Submitted shot={latestShot} at={view.submittedAt} />}
            {(view.state === "failed" || view.state === "cancelled") && (
              <Panel className="p-8 text-center">
                <h2 className="font-display text-[30px] leading-none uppercase">{view.state === "failed" ? "This run failed" : "Application cancelled"}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">{view.error ?? "You can start again from the opportunity page."}</p>
              </Panel>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function stageKey(s: ApplicationState) {
  return s === "queued" ? "filling" : s;
}

function Working({ title, body, steps }: { title: string; body: string; steps: Step[] }) {
  return (
    <Panel className="flex flex-col items-center p-10 text-center" aria-live="polite">
      <Spinner className="size-6 text-text" />
      <h2 className="mt-5 font-display text-[30px] leading-none uppercase">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{body}</p>
      <ul className="mt-6 space-y-1.5 font-mono text-xs text-muted">
        {steps.slice(-4).map((s) => (
          <li key={s.seq}>· {s.message}</li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------- 1. Materials + Truthfulness Verifier ----------------

const CLAIM_STYLE: Record<ClaimCheck["status"], string> = {
  supported: "border-eligible/30 bg-eligible/5",
  rephrased: "border-likely/30 bg-likely/5",
  unsupported: "border-danger/40 bg-danger/10",
};
const CLAIM_LABEL: Record<ClaimCheck["status"], string> = { supported: "Backed by resume", rephrased: "Reworded", unsupported: "Not in your resume" };

function Materials({
  view,
  busy,
  host,
  onSave,
  onApprove,
}: {
  view: View & { tailored: Tailored; verifier: VerifierReport };
  busy: boolean;
  host: string;
  onSave: (t: Tailored) => void;
  onApprove: (accepted: string[]) => void;
}) {
  const [draft, setDraft] = useState<Tailored>(view.tailored);
  const [accepted, setAccepted] = useState<string[]>(view.acceptedClaims);
  // Polls return fresh objects every few seconds; only reset the draft when the saved content actually changes.
  const serverKey = JSON.stringify(view.tailored);
  const [baseKey, setBaseKey] = useState(serverKey);
  if (baseKey !== serverKey) {
    setBaseKey(serverKey);
    setDraft(view.tailored);
  }

  const claims = view.verifier.claims;
  const unsupported = claims.filter((c) => c.status === "unsupported");
  const blocking = unsupported.filter((c) => !accepted.includes(c.claim));
  const dirty = JSON.stringify(draft) !== serverKey;
  const counts = useMemo(
    () => ({
      supported: claims.filter((c) => c.status === "supported").length,
      rephrased: claims.filter((c) => c.status === "rephrased").length,
      unsupported: unsupported.length,
    }),
    [claims, unsupported.length],
  );
  const area = "w-full rounded-md border border-border-strong bg-sunken/40 p-3.5 text-sm leading-relaxed focus:border-text focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="space-y-6 p-5 sm:p-6">
        <div>
          <SectionLabel className="mb-2">Summary</SectionLabel>
          <textarea className={area} rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
        </div>
        <div>
          <SectionLabel className="mb-2">Highlighted experience</SectionLabel>
          <div className="space-y-2">
            {draft.bullets.map((b, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-3 w-24 shrink-0 truncate font-mono text-[10px] uppercase tracking-wider text-faint" title={b.section}>
                  {b.section}
                </span>
                <textarea
                  className={area}
                  rows={2}
                  value={b.text}
                  onChange={(e) => setDraft({ ...draft, bullets: draft.bullets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel className="mb-2">Cover letter</SectionLabel>
          <textarea className={area} rows={12} value={draft.coverLetter} onChange={(e) => setDraft({ ...draft, coverLetter: e.target.value })} />
        </div>
        <div>
          <SectionLabel className="mb-2">Answers to common questions</SectionLabel>
          <div className="space-y-3">
            {draft.answers.map((a, i) => (
              <div key={i}>
                <div className="mb-1.5 text-sm font-medium">{a.question}</div>
                <textarea
                  className={area}
                  rows={3}
                  value={a.answer}
                  onChange={(e) => setDraft({ ...draft, answers: draft.answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })}
                />
              </div>
            ))}
          </div>
        </div>
        {dirty ? (
          <div className="sticky bottom-24 flex items-center justify-between gap-3 rounded-md border border-text/80 bg-surface p-3 md:bottom-4">
            <span className="text-sm text-muted">Edits are re-checked by the verifier.</span>
            <Button size="sm" onClick={() => onSave(draft)} disabled={busy}>
              {busy ? <Spinner /> : null} Save & re-verify
            </Button>
          </div>
        ) : null}
      </Panel>

      <div className="space-y-4 lg:sticky lg:top-10 lg:self-start lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto scrollbar-thin">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-text" />
            <h2 className="font-medium">Truthfulness Verifier</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">Every factual claim above, checked against your resume. Anything we can&apos;t back up is blocked until you fix it or confirm it&apos;s true.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(["supported", "rephrased", "unsupported"] as const).map((k) => (
              <div key={k} className={cn("rounded-md border px-2 py-2", CLAIM_STYLE[k])}>
                <div className="font-mono text-lg tabular">{counts[k]}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted">{CLAIM_LABEL[k]}</div>
              </div>
            ))}
          </div>
          <ul className="scrollbar-thin mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {[...claims]
              .sort((a, b) => order(a.status) - order(b.status))
              .map((c, i) => (
                <li key={i} className={cn("rounded-md border p-3 text-sm", CLAIM_STYLE[c.status])}>
                  <div className="flex items-start gap-2">
                    {c.status === "unsupported" ? <X className="mt-0.5 size-3.5 shrink-0 text-danger" /> : <Check className={cn("mt-0.5 size-3.5 shrink-0", c.status === "supported" ? "text-eligible" : "text-likely")} />}
                    <div className="min-w-0">
                      <p className="leading-snug">{c.claim}</p>
                      {c.note ? <p className="mt-1 text-xs text-muted">{c.note}</p> : null}
                      {c.source ? <p className="mt-1 text-xs text-faint">Resume: “{c.source}”</p> : null}
                      {c.status === "unsupported" ? (
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent)]"
                            checked={accepted.includes(c.claim)}
                            onChange={(e) => setAccepted(e.target.checked ? [...accepted, c.claim] : accepted.filter((x) => x !== c.claim))}
                          />
                          This is true. I&apos;ll stand behind it.
                        </label>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </Panel>
        <Button size="lg" className="w-full" disabled={busy || dirty || blocking.length > 0} onClick={() => onApprove(accepted)}>
          {busy ? <Spinner /> : <Bot className="size-4" />}
          {view.agentSupported ? `Approve & let the agent fill ${host}` : "Approve & prepare my answers"}
        </Button>
        <p className="text-center text-xs text-muted">
          {blocking.length
            ? `${blocking.length} claim${blocking.length > 1 ? "s" : ""} to fix or confirm first.`
            : dirty
              ? "Save your edits first."
              : view.agentSupported
                ? "Nothing is submitted until you approve the filled form."
                : "This site isn't automatable yet, so you'll get everything ready to paste."}
        </p>
      </div>
    </div>
  );
}

function order(s: ClaimCheck["status"]) {
  return s === "unsupported" ? 0 : s === "rephrased" ? 1 : 2;
}

// ---------------- 2. Live agent view ----------------

const STEP_ICON: Record<string, typeof Bot> = { action: MousePointerClick, thought: Eye, system: Terminal, error: AlertTriangle };

function AgentView({ shot, steps, host, live, title }: { shot: string | null; steps: Step[]; host: string; live?: boolean; title?: string }) {
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [steps.length]);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <BrowserFrame shot={shot} host={host} live={live} title={title} />
      <Panel className="flex max-h-[600px] flex-col p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Bot className="size-4 text-text" />
          <span className="text-sm font-medium">Muse Wonder · action log</span>
          {live ? <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-eligible"><span className="size-1.5 caret rounded-full bg-eligible" /> live</span> : null}
        </div>
        <ol ref={logRef} className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-4" aria-live="polite">
          {steps.map((s) => {
            const Icon = STEP_ICON[s.kind] ?? Terminal;
            return (
              <motion.li key={s.seq} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 text-xs leading-relaxed">
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", s.kind === "error" ? "text-danger" : s.kind === "action" ? "text-signal" : "text-faint")} />
                <span className={cn(s.kind === "error" ? "text-danger" : "text-muted", "break-words")}>{s.message}</span>
              </motion.li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

function BrowserFrame({ shot, host, live, title }: { shot: string | null; host: string; live?: boolean; title?: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border-strong bg-sunken">
      <div className="flex items-center gap-2 border-b border-border bg-elevated px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="mx-auto truncate rounded-md bg-sunken px-3 py-0.5 font-mono text-[11px] text-muted">{host}</span>
        {title ? <span className="text-xs text-text">{title}</span> : null}
        {live ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal">
            <span className="caret size-1.5 rounded-full bg-signal" /> Live
          </span>
        ) : null}
      </div>
      <div className="relative aspect-[1280/900] w-full">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element -- base64 screenshot from the agent's sandbox
          <img src={`data:image/jpeg;base64,${shot}`} alt="What the agent currently sees" className="absolute inset-0 size-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <Spinner className="size-5 text-text" />
              <p className="mt-3 text-sm text-muted">Starting an isolated browser…</p>
            </div>
          </div>
        )}
              </div>
    </div>
  );
}

// ---------------- 3. Review gate ----------------

function Review({
  view,
  shot,
  steps,
  host,
  busy,
  onSubmit,
  onCancel,
}: {
  view: View;
  shot: string | null;
  steps: Step[];
  host: string;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const missing = view.fields.filter((f) => f.label.includes("(required, empty)"));
  const summary = [...steps].reverse().find((s) => s.kind === "system")?.message;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <BrowserFrame shot={shot} host={host} />
      <div className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Hand className="size-5 text-text" />
            <h2 className="font-medium">Your approval is needed</h2>
          </div>
          {summary ? <p className="mt-2 text-sm text-muted">{summary}</p> : null}
          <SectionLabel className="mt-5">What the agent entered</SectionLabel>
          <dl className="scrollbar-thin mt-2 max-h-[300px] divide-y divide-border overflow-y-auto text-sm">
            {view.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,40%)_1fr] gap-3 py-2">
                <dt className={cn("truncate", f.label.includes("(required, empty)") ? "text-danger" : "text-muted")} title={f.label}>
                  {f.label.replace(" (required, empty)", "")}
                </dt>
                <dd className="truncate" title={f.value}>
                  {f.value || <span className="text-faint">empty</span>}
                </dd>
              </div>
            ))}
          </dl>
          {missing.length ? (
            <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {missing.length} required field{missing.length > 1 ? "s are" : " is"} still empty. The site may reject the submission. Consider finishing it yourself.
            </p>
          ) : null}
        </Panel>
        {!confirm ? (
          <Button size="lg" className="w-full" onClick={() => setConfirm(true)} disabled={busy}>
            <Check className="size-4" /> Approve submission
          </Button>
        ) : (
          <div className="rounded-md border border-text/60 bg-sage/25 p-4">
            <p className="text-sm">Submit this application to {host} now? This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={onSubmit} disabled={busy}>
                {busy ? <Spinner /> : null} Yes, submit
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Not yet
              </Button>
            </div>
          </div>
        )}
        <button type="button" onClick={onCancel} className="w-full text-center text-xs text-muted hover:text-text">
          Cancel this application
        </button>
      </div>
    </div>
  );
}

// ---------------- Handoff + done ----------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted hover:bg-elevated hover:text-text"
    >
      {copied ? <Check className="size-3.5 text-eligible" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Handoff({ view, applyUrl, busy, onManual }: { view: View; applyUrl: string; busy: boolean; onManual: () => void }) {
  const t = view.tailored;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-[30px] leading-none uppercase">Your turn, with everything ready</h2>
          <p className="mt-2 text-sm text-muted">{view.error ?? "This form needs a human touch. Every answer below is verified against your resume. Copy, paste, done."}</p>
        </div>
        {t ? (
          <>
            {[{ question: "Cover letter", answer: t.coverLetter }, { question: "Summary", answer: t.summary }, ...t.answers].map((a, i) => (
              <div key={i} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{a.question}</span>
                  <CopyButton text={a.answer} />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{a.answer}</p>
              </div>
            ))}
          </>
        ) : null}
      </Panel>
      <div className="space-y-3 lg:sticky lg:top-10 lg:self-start lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto scrollbar-thin">
        <a href={applyUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}>
          Open the application <ExternalLink className="size-4" />
        </a>
        <Button variant="secondary" size="lg" className="w-full" onClick={onManual} disabled={busy}>
          <CheckCircle2 className="size-4" /> I submitted it
        </Button>
        <p className="text-center text-xs text-muted">Marking it submitted moves it along your pipeline.</p>
      </div>
    </div>
  );
}

function Submitted({ shot, at }: { shot: string | null; at: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="flex flex-col items-center justify-center p-10 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="grid size-14 place-items-center rounded-full bg-eligible/15">
          <CheckCircle2 className="size-7 text-eligible" />
        </motion.div>
        <h2 className="mt-5 font-display text-[44px] leading-[0.95] uppercase">Submitted.</h2>
        <p className="mt-2 text-sm text-muted">{at ? <LocalTime value={at} /> : null} · tracked in your pipeline. Good luck.</p>
      </Panel>
      {shot ? (
        // eslint-disable-next-line @next/next/no-img-element -- confirmation screenshot
        <img src={`data:image/jpeg;base64,${shot}`} alt="Confirmation page" className="w-full rounded-md border border-border object-cover object-top" />
      ) : null}
    </div>
  );
}
