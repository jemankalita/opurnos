import { describe, expect, it } from "vitest";
import { sourceHealth } from "@/lib/source-health";

const now = new Date("2026-10-28T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("sourceHealth", () => {
  it("is ok for a recent run with listings", () => {
    expect(sourceHealth({ status: "ok", lastCount: 63, lastRunAt: hoursAgo(2) }, now)).toBe("ok");
  });

  it("flags a recent run that returned nothing as empty", () => {
    expect(sourceHealth({ status: "ok", lastCount: 0, lastRunAt: hoursAgo(2) }, now)).toBe("empty");
  });

  it("flags sources not checked for over 30 hours as stale", () => {
    expect(sourceHealth({ status: "ok", lastCount: 10, lastRunAt: hoursAgo(31).toISOString() }, now)).toBe("stale");
  });

  it("reports errors, running and never-run sources as such", () => {
    expect(sourceHealth({ status: "error", lastCount: 10, lastRunAt: hoursAgo(1) }, now)).toBe("error");
    expect(sourceHealth({ status: "running", lastCount: 0, lastRunAt: null }, now)).toBe("running");
    expect(sourceHealth({ status: "idle", lastCount: 0, lastRunAt: null }, now)).toBe("never");
  });
});
