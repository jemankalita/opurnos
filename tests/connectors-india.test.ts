import { afterEach, describe, expect, it, vi } from "vitest";
import { mapSmartRecruiters, smartRecruiters } from "@/lib/connectors/ats";
import { mapCodeChef, mapCodeforces, parseAtCoder } from "@/lib/connectors/contests";

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

describe("AtCoder", () => {
  const row = (iso: string, slug: string, name: string, dur: string, rated: string) =>
    `<tr><td class="text-center"><a href='http://x'><time class='fixtime fixtime-full'>${iso}</time></a></td>
    <td ><span title="Algorithm">Ⓐ</span><span class="user-blue">◉</span> <a href="/contests/${slug}">${name}</a></td>
    <td class="text-center">${dur}</td>
    <td class="text-center">${rated}</td></tr>`;
  const html = `<div id="contest-table-upcoming"><table><tbody>${row("2026-11-07 21:00:00+0900", "abc483", "AtCoder Beginner Contest 483", "01:40", " - 1999")}${row(
    "2026-11-08 21:00:00+0900",
    "agc079",
    "AtCoder Grand Contest 079",
    "03:30",
    "-",
  )}</tbody></table></div><div id="contest-table-recent"><table>${row("2026-10-01 21:00:00+0900", "abc470", "Old", "01:40", "-")}</table></div>`;

  it("reads only upcoming contests, with the JST start time as the deadline", () => {
    const list = parseAtCoder(html);
    expect(list.map((o) => o.externalId)).toEqual(["abc483", "agc079"]);
    expect(list[0].deadline?.toISOString()).toBe("2026-11-07T12:00:00.000Z");
    expect(list[0]).toMatchObject({ type: "competition", url: "https://atcoder.jp/contests/abc483", tags: ["Competitive programming", "Rated -1999"] });
    expect(list[0].description).toContain("1.7 hours");
    expect(list[1].tags).toContain("Unrated");
  });

  it("returns nothing when the upcoming table is missing", () => {
    expect(parseAtCoder("<html></html>")).toEqual([]);
  });
});
