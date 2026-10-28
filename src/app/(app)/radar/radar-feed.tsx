"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bookmark, BookmarkCheck, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Button, Deadline, EmptyState, Kbd, SectionLabel, Spinner, TypePill, VerdictPill } from "@/components/ui";
import { cn, daysUntil, TYPE_LABEL, VERDICT_LABEL } from "@/lib/utils";

export type FeedItem = {
  opportunityId: string;
  verdict: string;
  score: number;
  why: string;
  status: string;
  title: string;
  org: string;
  orgLogo: string | null;
  type: string;
  deadline: string | null;
  locations: string[];
  remote: boolean;
  comp: string | null;
  sourceId: string;
  judgedBy: string;
  createdAt: string;
};

type Sort = "score" | "deadline" | "new";

const VERDICTS = ["eligible", "likely", "stretch"] as const;
const SORTS: [Sort, string][] = [
  ["score", "Best match"],
  ["deadline", "Closing soonest"],
  ["new", "Newest"],
];
const TYPE_TONE: Record<string, string> = {
  hackathon: "bg-peri",
  internship: "bg-sage",
  fellowship: "bg-clay",
  scholarship: "bg-sky",
  research: "bg-peri",
  job: "bg-sand",
  competition: "bg-sage",
  grant: "bg-clay",
  conference: "bg-sky",
};

export function RadarFeed({ items: initial, firstName, lastMatchedAt }: { items: FeedItem[]; firstName: string; lastMatchedAt: string | null }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [type, setType] = useState<string>("all");
  const [verdict, setVerdict] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [cursor, setCursor] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  // Server refresh (after a rescan) replaces the local list; adjusting during render avoids an extra effect pass.
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setItems(initial);
  }

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((i) => counts.set(i.type, (counts.get(i.type) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = useMemo(() => {
    const list = items.filter((i) => (type === "all" || i.type === type) && (verdict === "all" || i.verdict === verdict));
    if (sort === "deadline") return [...list].sort((a, b) => (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity));
    if (sort === "new") return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return list;
  }, [items, type, verdict, sort]);

  const closingSoon = items.filter((i) => {
    const d = daysUntil(i.deadline);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const update = useCallback(async (id: string, status: "saved" | "dismissed" | "new") => {
    setItems((prev) => (status === "dismissed" ? prev.filter((i) => i.opportunityId !== id) : prev.map((i) => (i.opportunityId === id ? { ...i, status } : i))));
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(status === "dismissed" ? { status, feedback: -1 } : { status }),
    });
  }, []);

  async function rescan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const json = await fetch("/api/match", { method: "POST" }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
      setScanMsg(`Checked ${json.data.triaged} candidates · ${json.data.judged} new verdicts${json.data.scouted ? ` · ${json.data.scouted} found by Web Scout` : ""}`);
      router.refresh();
    } catch (err) {
      setScanMsg(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  // Keyboard: j/k move, s save, x dismiss, enter/o open, a apply.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey) return;
      const current = visible[cursor];
      if (e.key === "j") setCursor((c) => Math.min(visible.length - 1, c + 1));
      else if (e.key === "k") setCursor((c) => Math.max(0, c - 1));
      else if (!current) return;
      else if (e.key === "s") update(current.opportunityId, current.status === "saved" ? "new" : "saved");
      else if (e.key === "x") update(current.opportunityId, "dismissed");
      else if (e.key === "Enter" || e.key === "o") router.push(`/o/${current.opportunityId}`);
      else if (e.key === "a") router.push(`/o/${current.opportunityId}?apply=1`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, cursor, update, router]);

  // Follow the keyboard cursor, but never scroll on first paint.
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    document.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const pickType = (t: string) => {
    setType(t);
    setCursor(0);
  };

  return (
    <div>
      <Masthead firstName={firstName} count={items.length} lastMatchedAt={lastMatchedAt} scanning={scanning} onRescan={rescan} />
      {scanMsg ? (
        <p className="mt-3 font-mono text-xs text-muted" aria-live="polite">
          {scanMsg}
        </p>
      ) : null}

      <Figures items={items} closingSoon={closingSoon} verdict={verdict} onVerdict={(v) => setVerdict(verdict === v ? "all" : v)} />

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-text/80 pb-3">
            <div className="scrollbar-thin -mx-1 flex max-w-full gap-5 overflow-x-auto px-1 lg:hidden" role="tablist" aria-label="Filter by type">
              {[["all", items.length] as [string, number], ...types].map(([t, n]) => (
                <TypeTab key={t} active={type === t} label={t === "all" ? "All" : TYPE_LABEL[t]} n={n} onClick={() => pickType(t)} />
              ))}
            </div>
            <p className="hidden text-[15px] lg:block">
              {visible.length} {type === "all" ? "opportunities" : `${TYPE_LABEL[type]?.toLowerCase()}s`}
              {verdict !== "all" ? <span className="text-muted"> · {VERDICT_LABEL[verdict]}</span> : null}
            </p>
            <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-8 rounded-md border border-border-strong bg-surface px-2 text-[13px] text-text focus:border-text focus:outline-none"
              >
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={items.length ? "Nothing in this filter" : "Quiet skies, for now"}
                body={items.length ? "Try another kind or eligibility." : "We haven't found matches yet. Rescan, or widen your preferences to include more opportunity types."}
                action={
                  items.length ? null : (
                    <Button onClick={rescan} disabled={scanning}>
                      {scanning ? <Spinner /> : <RefreshCw className="size-4" />} Rescan now
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {visible.map((item, i) => (
                  <motion.li
                    key={item.opportunityId}
                    layout
                    data-row={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => setCursor(i)}
                    className={cn("group relative border-b border-dotted border-border-strong transition-colors", cursor === i && "bg-elevated/70")}
                  >
                    <Row item={item} active={cursor === i} onSave={() => update(item.opportunityId, item.status === "saved" ? "new" : "saved")} onDismiss={() => update(item.opportunityId, "dismissed")} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <Sidebar types={types} total={items.length} type={type} onType={pickType} />
      </div>
    </div>
  );
}

function Masthead(props: { firstName: string; count: number; lastMatchedAt: string | null; scanning: boolean; onRescan: () => void }) {
  const { firstName, count, lastMatchedAt, scanning, onRescan } = props;
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="label">{lastMatchedAt ? <>Swept <LocalTime value={lastMatchedAt} /></> : "Not swept yet"}</p>
        <h1 className="mt-3 font-display text-[40px] leading-[0.95] uppercase sm:text-[56px]">
          {count ? (
            <>
              {firstName ? `${firstName}, ` : ""}
              <span className="tabular">{count}</span> <em className="font-serif normal-case italic">on your</em> radar
            </>
          ) : (
            <>
              Your <em className="font-serif normal-case italic">radar</em>
            </>
          )}
        </h1>
      </div>
      <Button variant="secondary" onClick={onRescan} disabled={scanning}>
        {scanning ? <Spinner /> : <RefreshCw className="size-4" />}
        {scanning ? "Sweeping…" : "Sweep again"}
      </Button>
    </header>
  );
}

/** Verdict counts as a printed figure strip. Each figure doubles as the eligibility filter. */
function Figures({ items, closingSoon, verdict, onVerdict }: { items: FeedItem[]; closingSoon: number; verdict: string; onVerdict: (v: string) => void }) {
  const count = (v: string) => items.filter((i) => i.verdict === v).length;
  return (
    <div className="mt-8 grid grid-cols-2 border-y border-text/80 sm:grid-cols-4">
      {VERDICTS.map((v, i) => (
        <button
          key={v}
          type="button"
          onClick={() => onVerdict(v)}
          aria-pressed={verdict === v}
          className={cn(
            "flex flex-col items-start px-4 py-4 text-left transition-colors hover:bg-elevated/70 sm:px-5",
            i % 2 === 1 && "border-l border-dotted border-border-strong",
            i === 2 && "border-t border-dotted border-border-strong sm:border-t-0 sm:border-l",
            verdict === v && "bg-elevated",
          )}
        >
          <span className="font-display text-[40px] leading-none tabular">{count(v)}</span>
          <span className="mt-2 flex items-center gap-2 text-[13px] text-muted">
            <VerdictPill verdict={v} className="h-5 px-1.5 text-[11px]" />
            {verdict === v ? "filtering" : ""}
          </span>
        </button>
      ))}
      <div className="flex flex-col items-start border-t border-l border-dotted border-border-strong px-4 py-4 sm:border-t-0 sm:px-5">
        <span className={cn("font-display text-[40px] leading-none tabular", closingSoon > 0 && "text-signal")}>{closingSoon}</span>
        <span className="mt-2 text-[13px] text-muted">close within a week</span>
      </div>
    </div>
  );
}

function TypeTab({ active, label, n, onClick }: { active: boolean; label: string; n: number; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("inline-flex shrink-0 items-baseline gap-1.5 py-1 text-[14px] decoration-1 underline-offset-[6px]", active ? "text-text underline" : "text-muted hover:text-text")}
    >
      {label}
      <span className="font-mono text-[11px] text-faint tabular">{n}</span>
    </button>
  );
}

const KEYS: [string[], string][] = [
  [["j", "k"], "Move"],
  [["o"], "Open"],
  [["a"], "Apply"],
  [["s"], "Save"],
  [["x"], "Not for me"],
];

function Sidebar({ types, total, type, onType }: { types: [string, number][]; total: number; type: string; onType: (t: string) => void }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-10">
        <nav aria-label="Filter by kind">
          <SectionLabel>By kind</SectionLabel>
          <ul className="mt-3 border-b border-dotted border-border-strong">
            {[["all", total] as [string, number], ...types].map(([t, n]) => (
              <li key={t} className="border-t border-dotted border-border-strong">
                <button
                  type="button"
                  onClick={() => onType(t)}
                  aria-pressed={type === t}
                  className={cn("flex w-full items-center gap-3 py-2.5 text-left text-[15px] transition-colors", type === t ? "font-medium text-text" : "text-muted hover:text-text")}
                >
                  <span className={cn("size-2.5 rounded-[1px]", t === "all" ? "bg-text" : (TYPE_TONE[t] ?? "bg-sand"))} aria-hidden />
                  <span className="flex-1">{t === "all" ? "Everything" : TYPE_LABEL[t]}</span>
                  <span className="font-mono text-[12px] tabular">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <SectionLabel>Keyboard</SectionLabel>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px] text-muted">
            {KEYS.map(([keys, label]) => (
              <div key={label} className="contents">
                <dt className="flex gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </aside>
  );
}

function Row({ item, active, onSave, onDismiss }: { item: FeedItem; active: boolean; onSave: () => void; onDismiss: () => void }) {
  const place = item.remote ? "Remote" : item.locations.slice(0, 2).join(" · ");
  const saved = item.status === "saved";
  const iconBtn = "grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-text hover:text-bg";
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 py-5 pr-2 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:pl-1">
      <div className="pt-0.5 text-center">
        <span className={cn("font-display text-[34px] leading-none tabular sm:text-[40px]", active && "underline decoration-1 underline-offset-4")}>{item.score}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-faint">match</span>
      </div>
      <Link href={`/o/${item.opportunityId}`} className="min-w-0 focus:outline-none" prefetch={false}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TypePill type={item.type} className="h-auto" />
          {item.sourceId === "web:scout" ? <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-signal">Found by Web Scout</span> : null}
        </div>
        <h3 className="mt-1.5 font-serif text-[21px] leading-snug decoration-1 underline-offset-4 group-hover:underline">{item.title}</h3>
        <p className="mt-0.5 truncate text-[14px] text-muted">
          {item.org}
          {place ? ` · ${place}` : ""}
          {item.comp ? ` · ${item.comp}` : ""}
        </p>
        <p className="mt-2 line-clamp-2 max-w-[62ch] text-[15px] text-pretty">{item.why}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VerdictPill verdict={item.verdict} />
          <Deadline deadline={item.deadline} />
        </div>
      </Link>
      <div className="col-start-2 flex gap-1 sm:col-start-auto sm:flex-col sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button type="button" onClick={onSave} className={iconBtn} aria-label={saved ? "Unsave" : "Save"}>
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
        <button type="button" onClick={onDismiss} className={iconBtn} aria-label="Not for me">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
