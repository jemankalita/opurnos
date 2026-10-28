"use client";

import Link from "next/link";
import { useState } from "react";
import { Deadline, OrgAvatar, TypePill } from "@/components/ui";
import type { MatchStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Item = {
  opportunityId: string;
  title: string;
  org: string;
  orgLogo: string | null;
  type: string;
  status: MatchStatus;
  score: number;
  deadline: string | null;
};

const COLUMNS: { status: MatchStatus; label: string; tone: string }[] = [
  { status: "saved", label: "Saved", tone: "var(--muted)" },
  { status: "applying", label: "Applying", tone: "var(--accent)" },
  { status: "submitted", label: "Submitted", tone: "var(--likely)" },
  { status: "interview", label: "Interview", tone: "var(--stretch)" },
  { status: "offer", label: "Offer", tone: "var(--eligible)" },
  { status: "rejected", label: "Closed", tone: "var(--ineligible)" },
];

export function Board({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [over, setOver] = useState<MatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(id: string, status: MatchStatus) {
    const prev = items;
    setItems(items.map((i) => (i.opportunityId === id ? { ...i, status } : i)));
    setError(null);
    try {
      const json = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error);
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : "Couldn't move that card.");
    }
  }

  const sent = items.filter((i) => ["submitted", "interview", "offer", "rejected"].includes(i.status)).length;
  const funnel = [
    { label: "Tracked", value: items.length },
    { label: "Sent", value: sent },
    { label: "Interviews", value: items.filter((i) => i.status === "interview" || i.status === "offer").length },
    { label: "Offers", value: items.filter((i) => i.status === "offer").length },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 border-y border-text/80 sm:grid-cols-4">
        {funnel.map((f, i) => (
          <div
            key={f.label}
            className={cn(
              "flex flex-col-reverse px-4 py-4 sm:px-5",
              i % 2 === 1 && "border-l border-dotted border-border-strong",
              i >= 2 && "border-t border-dotted border-border-strong sm:border-t-0",
              i === 2 && "sm:border-l",
            )}
          >
            <dt className="mt-2 text-[13px] text-muted">{f.label}</dt>
            <dd className="font-display text-[40px] leading-none tabular">{f.value}</dd>
          </div>
        ))}
      </dl>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="scrollbar-thin -mx-4 mt-8 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:scroll-px-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-6 xl:overflow-visible xl:px-0">
        {COLUMNS.map((col) => {
          const list = items.filter((i) => i.status === col.status);
          return (
            <section
              key={col.status}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.status);
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) void move(id, col.status);
              }}
              className={cn(
                "flex min-h-[340px] w-[248px] shrink-0 snap-start flex-col rounded-md border bg-sunken/40 p-2 transition-colors xl:w-auto",
                over === col.status ? "border-text bg-sage/30" : "border-border",
              )}
            >
              <header className="flex items-center gap-2 px-2 py-2">
                <span className="size-2 rounded-full" style={{ background: col.tone }} />
                <h2 className="text-[14px] font-medium">{col.label}</h2>
                <span className="ml-auto font-mono text-xs text-faint tabular">{list.length}</span>
              </header>
              <ul className="flex flex-1 flex-col gap-2">
                {list.map((item) => (
                  <Card key={item.opportunityId} item={item} onMove={move} />
                ))}
                {list.length === 0 ? (
                  <li className="grid flex-1 place-items-center rounded-md border border-dashed border-border-strong px-3 text-center text-[12px] text-faint">Drag a card here</li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({ item, onMove }: { item: Item; onMove: (id: string, s: MatchStatus) => void }) {
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.opportunityId)}
      className="group cursor-grab rounded-md border border-border bg-surface p-3 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <OrgAvatar org={item.org} logo={item.orgLogo} size={28} />
        <div className="min-w-0 flex-1">
          <Link href={`/o/${item.opportunityId}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline hover:underline-offset-4">
            {item.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">{item.org}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <TypePill type={item.type} />
        <Deadline deadline={item.deadline} className="text-xs whitespace-nowrap" />
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Move to</span>
        <select
          value={item.status}
          onChange={(e) => onMove(item.opportunityId, e.target.value as MatchStatus)}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-muted opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        >
          {COLUMNS.map((c) => (
            <option key={c.status} value={c.status}>
              {c.label}
            </option>
          ))}
          <option value="dismissed">Remove</option>
        </select>
      </label>
    </li>
  );
}
