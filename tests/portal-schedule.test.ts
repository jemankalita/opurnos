import { describe, expect, it } from "vitest";
import { istDay, programTiming } from "@/lib/portal/schedule";
import type { Program } from "@/lib/portal/types";

const base: Program = {
  id: "test",
  name: "Test Program",
  org: "Test Org",
  category: "internship",
  years: "1st-2nd",
  region: "india",
  location: "India",
  indianColleges: "yes",
  availability: "running",
  summary: "A test program.",
  url: "https://example.com",
  sources: [],
  confidence: "high",
  checkedOn: "2026-11-06",
};

const at = (iso: string) => new Date(`${iso}T06:00:00Z`);

describe("istDay", () => {
  it("rolls to the next day in India before it does in UTC", () => {
    expect(istDay(new Date("2026-11-06T19:00:00Z"))).toBe("2026-11-07");
    expect(istDay(new Date("2026-11-06T18:00:00Z"))).toBe("2026-11-06");
  });
});

describe("programTiming with published dates", () => {
  const published = { opens: "2026-10-01", closes: "2026-11-20" };

  it("is open between the published dates, and says how long is left", () => {
    const timing = programTiming({ ...base, published }, at("2026-11-06"));
    expect(timing.state).toBe("open");
    expect(timing.isProjected).toBe(false);
    expect(timing.daysLeft).toBe(14);
    expect(timing.label).toContain("20 Nov 2026");
  });

  it("still counts as open on the closing day", () => {
    expect(programTiming({ ...base, published }, at("2026-11-20")).state).toBe("open");
  });

  it("is opening when the published start is ahead", () => {
    const timing = programTiming({ ...base, published: { opens: "2027-01-15", closes: "2027-02-15" } }, at("2026-11-06"));
    expect(timing.state).toBe("opening");
    expect(timing.isProjected).toBe(false);
    expect(timing.label).toContain("15 Jan 2027");
  });

  it("treats a published closing date alone as open until then", () => {
    expect(programTiming({ ...base, published: { closes: "2026-12-01" } }, at("2026-11-06")).state).toBe("open");
  });
});

describe("programTiming with expected windows", () => {
  it("projects the next window when it is still ahead this year", () => {
    const timing = programTiming({ ...base, expected: { from: 12, to: 12 } }, at("2026-11-06"));
    expect(timing.state).toBe("expected");
    expect(timing.isProjected).toBe(true);
    expect(timing.label).toBe("Expected Dec 2026");
  });

  it("rolls to next year once this year's window has passed", () => {
    const timing = programTiming({ ...base, expected: { from: 3, to: 4 } }, at("2026-11-06"));
    expect(timing.label).toBe("Expected Mar–Apr 2027");
  });

  it("never says open for a projected window, only likely", () => {
    const timing = programTiming({ ...base, expected: { from: 10, to: 11 } }, at("2026-11-06"));
    expect(timing.state).toBe("likely-open");
    expect(timing.isProjected).toBe(true);
    expect(timing.label).not.toMatch(/^Open/);
  });

  it("handles a window that crosses new year", () => {
    expect(programTiming({ ...base, expected: { from: 11, to: 1 } }, at("2027-01-10")).state).toBe("likely-open");
    expect(programTiming({ ...base, expected: { from: 11, to: 1 } }, at("2026-09-10")).label).toBe("Expected Nov–Jan 2026");
  });

  it("moves to next year's window after this cycle's published close, even inside the usual months", () => {
    const timing = programTiming({ ...base, published: { closes: "2026-10-15" }, expected: { from: 10, to: 11 } }, at("2026-11-06"));
    expect(timing.state).toBe("expected");
    expect(timing.label).toBe("Expected Oct–Nov 2027");
  });

  it("does not let an old published close suppress a new cycle", () => {
    const timing = programTiming({ ...base, published: { closes: "2025-10-15" }, expected: { from: 10, to: 11 } }, at("2026-11-06"));
    expect(timing.state).toBe("likely-open");
  });
});

describe("programTiming other states", () => {
  it("reports a paused program as not running, whatever its dates", () => {
    const timing = programTiming({ ...base, availability: "paused", expected: { from: 10, to: 11 } }, at("2026-11-06"));
    expect(timing.state).toBe("paused");
  });

  it("reports a rolling program", () => {
    expect(programTiming({ ...base, rolling: true }, at("2026-11-06")).state).toBe("rolling");
  });

  it("admits when no date is known rather than inventing one", () => {
    const timing = programTiming(base, at("2026-11-06"));
    expect(timing.state).toBe("unknown");
    expect(timing.sortDay).toBeNull();
  });

  it("gives every dated state a day to sort by", () => {
    expect(programTiming({ ...base, expected: { from: 12, to: 12 } }, at("2026-11-06")).sortDay).toBe("2026-12-01");
    expect(programTiming({ ...base, published: { closes: "2026-12-01" } }, at("2026-11-06")).sortDay).toBe("2026-12-01");
  });
});
