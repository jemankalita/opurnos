import { describe, expect, it } from "vitest";
import { filterEntries, inSection, sortEntries, type TrackerEntry } from "@/lib/portal/tracker-view";
import type { Timing, TrackerState } from "@/lib/portal/schedule";
import type { Program } from "@/lib/portal/types";

const program: Program = {
  id: "p",
  name: "Sample Program",
  org: "Sample Org",
  category: "internship",
  years: "1st-2nd",
  region: "india",
  location: "India",
  indianColleges: "yes",
  availability: "running",
  summary: "Summary.",
  url: "https://example.com",
  sources: [],
  confidence: "high",
  checkedOn: "2026-11-06",
};

const timing = (state: TrackerState, sortDay: string | null = null): Timing => ({ state, label: state, isProjected: false, daysLeft: null, sortDay });
const entry = (over: Partial<Program>, t: Timing = timing("expected", "2027-01-01")): TrackerEntry => ({ program: { ...program, ...over }, timing: t, watch: null });

describe("inSection", () => {
  it("keeps the first-year section to first-year-only programs", () => {
    expect(inSection(entry({ years: "1st-only" }), "first")).toBe(true);
    expect(inSection(entry({ years: "1st-2nd" }), "first")).toBe(false);
    expect(inSection(entry({ years: "any-year" }), "first")).toBe(false);
  });

  it("puts everything else in the first and second year section", () => {
    expect(inSection(entry({ years: "1st-2nd" }), "both")).toBe(true);
    expect(inSection(entry({ years: "2nd-only" }), "both")).toBe(true);
    expect(inSection(entry({ years: "any-year" }), "both")).toBe(true);
    expect(inSection(entry({ years: "1st-only" }), "both")).toBe(false);
  });
});

describe("sortEntries", () => {
  it("puts open first by soonest close, then opening, then projections, then unknown, then paused", () => {
    const sorted = sortEntries([
      entry({ id: "paused" }, timing("paused")),
      entry({ id: "unknown" }, timing("unknown")),
      entry({ id: "expected" }, timing("expected", "2027-01-01")),
      entry({ id: "open-later" }, timing("open", "2026-12-01")),
      entry({ id: "opening" }, timing("opening", "2026-11-20")),
      entry({ id: "open-soon" }, timing("open", "2026-11-10")),
    ]);
    expect(sorted.map((e) => e.program.id)).toEqual(["open-soon", "open-later", "opening", "expected", "unknown", "paused"]);
  });

  it("does not change the list it was given", () => {
    const list = [entry({ id: "b" }, timing("unknown")), entry({ id: "a" }, timing("open", "2026-12-01"))];
    sortEntries(list);
    expect(list[0].program.id).toBe("b");
  });
});

describe("filterEntries", () => {
  const all = { region: "all", category: "all", applyFromIndia: false, query: "" } as const;
  const list = [
    entry({ id: "india", region: "india", category: "scholarship", name: "INSPIRE SHE" }),
    entry({ id: "abroad", region: "abroad", category: "insight", org: "Jane Street", indianColleges: "unclear" }),
    entry({ id: "closed-off", region: "abroad", category: "insight", indianColleges: "no" }),
    entry({ id: "online", region: "online", category: "community" }),
  ];
  const ids = (filters: Parameters<typeof filterEntries>[1]) => filterEntries(list, filters).map((e) => e.program.id);

  it("returns everything with no filters", () => {
    expect(ids(all)).toHaveLength(4);
  });

  it("filters by region", () => {
    expect(ids({ ...all, region: "india" })).toEqual(["india"]);
    expect(ids({ ...all, region: "abroad" })).toEqual(["abroad", "closed-off"]);
  });

  it("filters by category", () => {
    expect(ids({ ...all, category: "scholarship" })).toEqual(["india"]);
  });

  it("hides only programs that shut out Indian colleges, and keeps the unclear ones", () => {
    expect(ids({ ...all, applyFromIndia: true })).toEqual(["india", "abroad", "online"]);
  });

  it("searches names and organisations, ignoring case", () => {
    expect(ids({ ...all, query: "inspire" })).toEqual(["india"]);
    expect(ids({ ...all, query: "JANE" })).toEqual(["abroad"]);
  });
});
