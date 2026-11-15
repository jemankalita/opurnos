"use client";

import { useMemo, useState } from "react";
import type { LiveListing } from "@/lib/portal/live";
import { filterEntries, inSection, sortEntries, type Filters, type Section, type TrackerEntry } from "@/lib/portal/tracker-view";
import type { Category, Region } from "@/lib/portal/types";
import { CATEGORY_LABEL, ProgramCard } from "./program-card";

const REGIONS: [Region | "all", string][] = [
  ["all", "Anywhere"],
  ["india", "India"],
  ["abroad", "Abroad"],
  ["online", "Online"],
];

const CATEGORIES: (Category | "all")[] = ["all", "internship", "scholarship", "research", "fellowship", "competition", "insight", "community"];

const SECTIONS: { id: Section; title: string; blurb: string }[] = [
  {
    id: "first",
    title: "First year only",
    blurb: "These must be claimed in your first year. A missed year can't be made up later.",
  },
  {
    id: "both",
    title: "First and second year",
    blurb: "Open to first-years, second-years, or any year. Some start in 2nd year, so check the Who line.",
  },
];

const selectClass = "h-9 rounded-full border border-border-strong bg-surface px-3 text-[14px]";

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        placeholder="Search programs or companies"
        aria-label="Search programs or companies"
        className="h-9 w-full rounded-full border border-border-strong bg-surface px-4 text-[14px] sm:w-64"
      />
      <select aria-label="Region" className={selectClass} value={filters.region} onChange={(e) => onChange({ ...filters, region: e.target.value as Filters["region"] })}>
        {REGIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select aria-label="Type" className={selectClass} value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value as Filters["category"] })}>
        {CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {value === "all" ? "All types" : CATEGORY_LABEL[value]}
          </option>
        ))}
      </select>
      <label className="inline-flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={filters.applyFromIndia} onChange={(e) => onChange({ ...filters, applyFromIndia: e.target.checked })} />
        Hide programs closed to Indian colleges
      </label>
    </div>
  );
}

function LiveListings({ live, isLiveDown }: { live: LiveListing[]; isLiveDown: boolean }) {
  return (
    <section className="mt-14" aria-labelledby="live-heading">
      <h2 id="live-heading" className="font-display text-[28px] uppercase leading-none">
        New on the radar
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-muted">
        Listings from the sources Opurnos scans whose titles mention first-years, sophomores, insight weeks or discovery programs. They aren&rsquo;t checked by hand.
      </p>
      {isLiveDown ? (
        <p className="mt-4 text-[14px] text-faint">Live listings are unavailable right now. The tracker above still works.</p>
      ) : live.length === 0 ? (
        <p className="mt-4 text-[14px] text-faint">Nothing new yet. Listings show up here after the next scan.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
          {live.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                {item.title}
              </a>
              <span className="text-[13px] text-muted">
                {item.org}
                {item.deadline && ` · closes ${new Date(item.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Tracker({ entries, live, today, isLiveDown }: { entries: TrackerEntry[]; live: LiveListing[]; today: string; isLiveDown: boolean }) {
  const [filters, setFilters] = useState<Filters>({ region: "all", category: "all", applyFromIndia: true, query: "" });
  const sorted = useMemo(() => sortEntries(filterEntries(entries, filters)), [entries, filters]);
  const openCount = sorted.filter((e) => e.timing.state === "open" || e.timing.state === "opening").length;

  return (
    <>
      <section className="py-6 md:py-10">
        <p className="label">Programs for 1st and 2nd-year students</p>
        <h1 className="mt-3 font-display text-[44px] uppercase leading-[0.95] md:text-[64px]">
          Start <em className="font-serif normal-case italic">early</em>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] text-muted">
          Internships, scholarships, research and insight programs you can apply to before your third year. Only dates a program has published read
          &ldquo;Open&rdquo;; anything projected from past years says so. {openCount > 0 && `${openCount} have published dates coming up.`}
        </p>
      </section>

      <FilterBar filters={filters} onChange={setFilters} />

      {SECTIONS.map((section) => {
        const items = sorted.filter((entry) => inSection(entry, section.id));
        return (
          <section key={section.id} className="mt-10" aria-labelledby={`section-${section.id}`}>
            <div className="flex items-baseline gap-3">
              <h2 id={`section-${section.id}`} className="font-display text-[28px] uppercase leading-none">
                {section.title}
              </h2>
              <span className="font-mono text-[12px] text-faint">{items.length}</span>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] text-muted">{section.blurb}</p>
            {items.length === 0 ? (
              <p className="mt-4 text-[14px] text-faint">No programs match these filters.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((entry) => (
                  <ProgramCard key={entry.program.id} entry={entry} today={today} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <LiveListings live={live} isLiveDown={isLiveDown} />
    </>
  );
}
