import { describe, expect, it } from "vitest";
import { PROGRAMS } from "@/lib/portal/programs";
import { programTiming } from "@/lib/portal/schedule";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isRealDay = (day: string) => ISO_DAY.test(day) && new Date(`${day}T00:00:00Z`).toISOString().startsWith(day);

describe("tracker data", () => {
  it("gives every program a unique id", () => {
    const ids = PROGRAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses https links for the official page and every source", () => {
    for (const p of PROGRAMS) {
      expect(p.url, p.id).toMatch(/^https:\/\//);
      expect(p.sources.length, p.id).toBeGreaterThan(0);
      for (const s of p.sources) expect(s, p.id).toMatch(/^https:\/\//);
    }
  });

  it("stores published and checked dates as real YYYY-MM-DD days, opens before closes", () => {
    for (const p of PROGRAMS) {
      expect(isRealDay(p.checkedOn), p.id).toBe(true);
      const { opens, closes } = p.published ?? {};
      if (opens) expect(isRealDay(opens), p.id).toBe(true);
      if (closes) expect(isRealDay(closes), p.id).toBe(true);
      if (opens && closes) expect(opens <= closes, p.id).toBe(true);
    }
  });

  it("keeps projected windows to calendar months", () => {
    for (const p of PROGRAMS) {
      if (!p.expected) continue;
      for (const month of [p.expected.from, p.expected.to]) {
        expect(Number.isInteger(month) && month >= 1 && month <= 12, p.id).toBe(true);
      }
    }
  });

  it("never projects dates for a program known to be paused", () => {
    for (const p of PROGRAMS.filter((program) => program.availability === "paused")) {
      expect(p.published?.opens ?? p.published?.closes ?? p.expected, p.id).toBeUndefined();
    }
  });

  it("works out a status for every program without throwing", () => {
    const now = new Date("2026-11-15T06:00:00Z");
    for (const p of PROGRAMS) expect(programTiming(p, now).label, p.id).toBeTruthy();
  });

  it("only labels a program Open when it has a published close date ahead", () => {
    const now = new Date("2026-11-15T06:00:00Z");
    for (const p of PROGRAMS) {
      if (programTiming(p, now).state === "open") expect((p.published?.closes ?? "") >= "2026-11-15", p.id).toBe(true);
    }
  });

  it("has programs in both sections", () => {
    expect(PROGRAMS.some((p) => p.years === "1st-only")).toBe(true);
    expect(PROGRAMS.some((p) => p.years !== "1st-only")).toBe(true);
  });
});
