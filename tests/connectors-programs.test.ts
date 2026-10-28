import { describe, expect, it } from "vitest";
import { fixMojibake, mapHnPost, mapRemoteOk } from "@/lib/connectors/boards";
import { CURATED_PROGRAMS } from "@/lib/connectors/curated-programs";
import { nextOccurrence, parseEthGlobal } from "@/lib/connectors/hackathons";
import { curated, mapGsoc, parseOutreachy } from "@/lib/connectors/programs";

const now = new Date("2026-10-28T12:00:00Z");

describe("mapGsoc", () => {
  const program = (deadline: string) => ({
    slug: "2027",
    is_active: true,
    milestones: [
      { name: "contributor_proposals_open", datetime: "2027-03-15T18:00:00Z", label: "" },
      { name: "proposal_deadline", datetime: deadline, label: "" },
    ],
  });

  it("emits the program while proposals are still open, with quoted rules", () => {
    const o = mapGsoc(program("2027-03-30T18:00:00Z"), now);
    expect(o).toMatchObject({ title: "Google Summer of Code 2027", type: "fellowship", remote: true });
    expect(o?.rules?.minAge).toBe(18);
    expect(o?.description).toContain("Student or Open source beginner");
  });

  it("emits nothing between rounds", () => {
    expect(mapGsoc(program("2026-03-31T18:00:00Z"), now)).toBeNull();
    expect(mapGsoc({ slug: "2028", is_active: false }, now)).toBeNull();
  });
});

describe("parseOutreachy", () => {
  const page = (deadline: string) =>
    `<h2>Outreachy May 2027 to August 2027 Internships Timeline</h2><p>${deadline} at 4pm UTC<span>Initial application deadline</span></p>`;

  it("emits the cohort with its initial application deadline in UTC", () => {
    const o = parseOutreachy(page("Feb. 5, 2027"), now);
    expect(o).toMatchObject({ title: "Outreachy internships, May 2027 to August 2027", comp: "$7,000 USD stipend" });
    expect(o?.deadline?.toISOString()).toBe("2027-02-05T16:00:00.000Z");
  });

  it("emits nothing once initial applications are closed", () => {
    expect(parseOutreachy(page("Aug. 31, 2026"), now)).toBeNull();
  });

  it("throws when the timeline is missing", () => {
    expect(() => parseOutreachy("<html></html>", now)).toThrow(/layout changed/);
  });
});

describe("curated programs", () => {
  it("every entry is dated, linked and unique", async () => {
    const ids = new Set(CURATED_PROGRAMS.map((p) => p.externalId));
    expect(ids.size).toBe(CURATED_PROGRAMS.length);
    for (const p of CURATED_PROGRAMS) {
      expect(p.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.url).toMatch(/^https:\/\//);
    }
    const listings = await curated.fetch();
    expect(listings[0]).not.toHaveProperty("checkedOn");
  });

  it("each stated rule is quoted in the description, so evidence can cite it", () => {
    for (const p of CURATED_PROGRAMS) for (const rule of p.rules?.other ?? []) expect(p.description).toContain(rule.replace(/\.$/, ""));
  });
});

describe("ETHGlobal", () => {
  const card = (href: string, month: string, day: string, name: string, city: string, kind: string) =>
    `<a class="x" href="${href}"><section class="y"><div><div>${month}</div><div><span>${day}</span></div></div><div><h2 class="z">${name}</h2><div><span><span>${city}<!-- -->, <!-- -->India</span></span><span><span>${kind}</span></span></div><div>Apply to Attend</div></div></section></a>`;
  const html = `<h2>Upcoming<!-- --> <span>2</span></h2>${card("/events/mumbai", "November", "5", "ETHGlobal Mumbai", "Mumbai", "IRL Hackathon")}${card(
    "/events/pragma-mumbai",
    "Nov",
    "06",
    "Pragma Mumbai",
    "Mumbai",
    "Conference",
  )}<h2>Past<!-- --></h2>`;

  it("parses upcoming hackathons and conferences", () => {
    const out = parseEthGlobal(html, now);
    expect(out.map((o) => [o.title, o.type, o.locations[0]])).toEqual([
      ["ETHGlobal Mumbai", "hackathon", "Mumbai, India"],
      ["Pragma Mumbai", "conference", "Mumbai, India"],
    ]);
    expect(out[0].deadline?.toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(out[0].url).toBe("https://ethglobal.com/events/mumbai");
  });

  it("rolls dates without a year into next year once passed", () => {
    expect(nextOccurrence("February", 3, now)?.toISOString().slice(0, 10)).toBe("2027-02-03");
  });

  it("throws when the upcoming section is missing", () => {
    expect(() => parseEthGlobal("<html></html>", now)).toThrow(/layout changed/);
  });
});

describe("HN Who is hiring", () => {
  it("keeps early-career posts and splits the header", () => {
    const o = mapHnPost({
      id: 1,
      created_at: "2026-10-01T16:55:54Z",
      text: 'SwingVision | Berkeley, CA | Full time + Internships<p>We use computer vision. Apply: <a href="https:&#x2F;&#x2F;x.com&#x2F;jobs">x</a>',
    });
    expect(o).toMatchObject({ org: "SwingVision", type: "internship", url: "https://news.ycombinator.com/item?id=1", applyUrl: "https://x.com/jobs" });
    expect(o?.locations).toEqual(["Berkeley, CA"]);
    expect(o?.title).toBe("Full time + Internships");
  });

  it("drops posts with no early-career roles or no header", () => {
    expect(mapHnPost({ id: 2, created_at: "", text: "Acme | Staff Engineer | Remote" })).toBeNull();
    expect(mapHnPost({ id: 3, created_at: "", text: "We hire interns, email us" })).toBeNull();
    expect(mapHnPost({ id: 4, created_at: "", text: null })).toBeNull();
  });

  it("does not read internal as an internship", () => {
    expect(mapHnPost({ id: 5, created_at: "", text: "Acme | Junior Engineer, internal tools | NYC" })?.type).toBe("job");
  });
});

describe("Remote OK", () => {
  it("repairs double-encoded text and leaves clean text alone", () => {
    expect(fixMojibake("Weâ\u0080\u0099re hiring")).toBe("We’re hiring");
    expect(fixMojibake("Café")).toBe("Café");
  });

  it("maps a junior role with attribution and skips senior ones", () => {
    const o = mapRemoteOk({ id: "9", position: "QA Tester Entry Level", company: "Acme", tags: ["qa", "dev"], url: "https://remoteOK.com/remote-jobs/9", date: "2026-10-26T08:00:12+00:00" });
    expect(o).toMatchObject({ ats: "remoteok", remote: true, locations: ["Remote"] });
    expect(o?.tags).toContain("via Remote OK");
    expect(o?.description).toMatch(/^Listed on Remote OK/);
    expect(mapRemoteOk({ id: "10", position: "Senior Engineer", tags: ["dev"], url: "https://remoteOK.com/x" })).toBeNull();
    expect(mapRemoteOk({ id: "11", position: "Account Executive", tags: ["dev"], url: "https://remoteOK.com/y" })).toBeNull();
  });
});
