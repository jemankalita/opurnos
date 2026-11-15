import type { Timing, TrackerState } from "./schedule";
import type { Category, Program, Region } from "./types";

export type WatchStatus = {
  checkedAt: string | null;
  changedAt: string | null;
  added: string[];
  lastError: string | null;
};

export type TrackerEntry = { program: Program; timing: Timing; watch: WatchStatus | null };

export type Section = "first" | "both";

export type Filters = {
  region: Region | "all";
  category: Category | "all";
  applyFromIndia: boolean;
  query: string;
};

const STATE_ORDER: Record<TrackerState, number> = { open: 0, opening: 1, "likely-open": 2, rolling: 3, expected: 4, unknown: 5, paused: 6 };

export const inSection = ({ program }: TrackerEntry, section: Section) => (program.years === "1st-only") === (section === "first");

export function sortEntries(entries: TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort(
    (a, b) =>
      STATE_ORDER[a.timing.state] - STATE_ORDER[b.timing.state] ||
      (a.timing.sortDay ?? "").localeCompare(b.timing.sortDay ?? "") ||
      a.program.name.localeCompare(b.program.name),
  );
}

export function filterEntries(entries: TrackerEntry[], { region, category, applyFromIndia, query }: Filters): TrackerEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(({ program }) => {
    if (region !== "all" && program.region !== region) return false;
    if (category !== "all" && program.category !== category) return false;
    if (applyFromIndia && program.indianColleges === "no") return false;
    return !needle || `${program.name} ${program.org}`.toLowerCase().includes(needle);
  });
}
