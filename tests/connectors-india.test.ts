import { afterEach, describe, expect, it, vi } from "vitest";
import { mapSmartRecruiters, smartRecruiters } from "@/lib/connectors/ats";
import { mapCodeChef, mapCodeforces } from "@/lib/connectors/contests";

describe("Codeforces", () => {
  it("keeps upcoming rounds with the start as the deadline", () => {
    const o = mapCodeforces({ id: 2285, name: "Codeforces Round (Div. 2)", type: "CF", phase: "BEFORE", durationSeconds: 7200, startTimeSeconds: 1794753300 });
    expect(o).toMatchObject({ type: "competition", url: "https://codeforces.com/contests/2285", remote: true, org: "Codeforces" });
    expect(o?.deadline?.getTime()).toBe(1794753300 * 1000);
    expect(o?.description).toContain("2 hours");
  });

  it("drops finished or unscheduled rounds", () => {
    expect(mapCodeforces({ id: 1, name: "Old", type: "CF", phase: "FINISHED", durationSeconds: 7200, startTimeSeconds: 1 })).toBeNull();
    expect(mapCodeforces({ id: 2, name: "TBA", type: "CF", phase: "BEFORE", durationSeconds: 7200 })).toBeNull();
  });
});

describe("CodeChef", () => {
  it("maps a future contest in IST", () => {
    const o = mapCodeChef({ contest_code: "START263", contest_name: "Starters 263", contest_start_date_iso: "2026-11-04T20:00:00+05:30", contest_duration: "120" });
    expect(o).toMatchObject({ url: "https://www.codechef.com/START263", type: "competition" });
    expect(o?.deadline?.toISOString()).toBe("2026-11-04T14:30:00.000Z");
    expect(o?.description).toContain("2 hours");
  });
});

describe("SmartRecruiters", () => {
  afterEach(() => vi.unstubAllGlobals());

  const posting = {
    id: "744000158290639",
    name: "Graduate Apprentice Trainee",
    releasedDate: "2026-10-28T10:00:00Z",
    company: { identifier: "SWIGGY", name: "SWIGGY" },
    location: { fullLocation: "Bengaluru, KA, India", city: "Bengaluru", country: "in", remote: false },
    typeOfEmployment: { label: "Full-time" },
    experienceLevel: { id: "entry_level", label: "Entry Level" },
    function: { label: "Engineering" },
  };

  it("maps a posting, keeps the readable org name and types internships", () => {
    const o = mapSmartRecruiters("Swiggy", "Swiggy", posting);
    expect(o).toMatchObject({ org: "Swiggy", url: "https://jobs.smartrecruiters.com/Swiggy/744000158290639", locations: ["Bengaluru, KA, India"], type: "job" });
    expect(o.tags).toEqual(["Engineering", "Full-time", "Entry Level"]);
    expect(mapSmartRecruiters("Swiggy", "Swiggy", { ...posting, experienceLevel: { id: "internship" } }).type).toBe("internship");
    expect(mapSmartRecruiters("Swiggy", "Swiggy", { ...posting, location: { fullLocation: "bangalore, , India" } }).locations).toEqual(["bangalore, India"]);
  });

  it("pages until totalFound and filters by country", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        urls.push(String(u));
        const offset = Number(new URL(String(u)).searchParams.get("offset"));
        return new Response(JSON.stringify({ totalFound: 150, content: Array.from({ length: offset ? 50 : 100 }, (_, i) => ({ ...posting, id: `${offset + i}` })) }));
      }),
    );
    const out = await smartRecruiters("Swiggy", "Swiggy", "in").fetch();
    expect(out).toHaveLength(150);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("country=in");
  });
});
