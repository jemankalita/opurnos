import { describe, expect, it } from "vitest";
import { mapAmazon, mapWorkday } from "@/lib/connectors/careers";
import { mapHackerEarth } from "@/lib/connectors/hackathons";
import { mapSimplify } from "@/lib/connectors/simplify";
import { EARLY_CAREER_RE } from "@/lib/connectors/types";

describe("EARLY_CAREER_RE", () => {
  it.each(["Software Engineer Intern", "2027 Intern - Research PhD Intern", "Hardware Engineer, New Grad (2027)", "Machine Learning Intern/Co-op", "Apprentice Technician"])(
    "matches %s",
    (t) => expect(EARLY_CAREER_RE.test(t)).toBe(true),
  );
  it.each(["International Tax Manager", "Manager, Internal Audit", "Staff Software Engineer"])("ignores %s", (t) => expect(EARLY_CAREER_RE.test(t)).toBe(false));
});

describe("mapWorkday", () => {
  it("uses a board's own fresher titles and country facet (Accenture India)", () => {
    const accenture = { tenant: "accenture", pod: "wd103", site: "AccentureCareers", org: "Accenture", titleRe: /\bnew assoc(iate)?\b/i, facetLocation: "India" };
    const o = mapWorkday(accenture, { title: "Health Operations New Associate", externalPath: "/job/Chennai/x_1", bulletFields: ["AIOC-1", "Chennai"] });
    expect(o).toMatchObject({ type: "job", locations: ["Chennai, India"], externalId: "AIOC-1" });
    expect(mapWorkday(accenture, { title: "Banking Operations New Associate Manager", externalPath: "/job/y" })).toBeNull();
    expect(mapWorkday(accenture, { title: "Software Engineering Intern", externalPath: "/job/z" })).toBeNull();
  });

  const board = { tenant: "nvidia", pod: "wd5", site: "NVIDIAExternalCareerSite", org: "NVIDIA" };

  it("builds the public job URL and keeps early-career titles", () => {
    const o = mapWorkday(board, { title: "DFT Intern - 2027", externalPath: "/job/China-Shanghai/DFT-Intern---2027_JR1", locationsText: "China, Shanghai", bulletFields: ["JR1"] });
    expect(o).toMatchObject({
      externalId: "JR1",
      url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/China-Shanghai/DFT-Intern---2027_JR1",
      type: "internship",
      org: "NVIDIA",
      locations: ["China, Shanghai"],
    });
  });

  it("drops what a fuzzy search for 'intern' drags in", () => {
    expect(mapWorkday(board, { title: "Manager, Internal Audit", externalPath: "/job/x" })).toBeNull();
  });
});

describe("mapAmazon", () => {
  it("joins description and qualifications and links the listing", () => {
    const o = mapAmazon({
      id_icims: "10590464",
      title: "Software Development Engineer Intern",
      job_path: "/en/jobs/10590464/sde-intern",
      url_next_step: "https://account.amazon.jobs/jobs/10590464/apply",
      normalized_location: "Seattle, Washington, USA",
      posted_date: "October 27, 2026",
      description: "Build things.",
      basic_qualifications: "- Currently enrolled in a Bachelor's degree",
    });
    expect(o).toMatchObject({ url: "https://www.amazon.jobs/en/jobs/10590464/sde-intern", org: "Amazon", type: "internship" });
    expect(o?.description).toContain("Basic qualifications:");
    expect(o?.postedAt?.getFullYear()).toBe(2026);
  });

  it("skips non-early-career roles", () => {
    expect(mapAmazon({ id_icims: "1", title: "Senior Manager, International", job_path: "/en/jobs/1" })).toBeNull();
  });
});

describe("mapHackerEarth", () => {
  it("uses UTC start and end, with the end as the deadline", () => {
    const o = mapHackerEarth({
      title: "MKS AI/ML Hackathon",
      description: "AI &amp; Data",
      url: "https://www.hackerearth.com/challenges/competitive/mks-inc-hackathon/",
      status: "UPCOMING",
      start_utc_tz: "2026-10-30 12:30:00+00:00",
      end_utc_tz: "2026-11-06 06:30:00+00:00",
      challenge_type: "Monthly Challenges",
    });
    expect(o).toMatchObject({ type: "hackathon", remote: true, tags: ["Monthly Challenges"] });
    expect(o.deadline?.toISOString()).toBe("2026-11-06T06:30:00.000Z");
    expect(o.description).toContain("AI & Data");
  });
});

describe("community internship list", () => {
  it("treats every listing as an internship even without Simplify-only fields", () => {
    const o = mapSimplify({ id: "v1", company_name: "Rippling", title: "Frontend Software Engineer", url: "https://x", active: true } as never, "community");
    expect(o.type).toBe("internship");
  });
});
