import { describe, expect, it } from "vitest";
import { mapAshby, mapGreenhouse, mapLever } from "@/lib/connectors/ats";
import { mapDevfolio, mapDevpost, mapHackClub, mapMlh, mapUnstop, mlhSeason, parseDevpostEnd, parseMlhEvents } from "@/lib/connectors/hackathons";
import { mapSimplify, simplifyRules } from "@/lib/connectors/simplify";
import { classifyJob, SENIOR_RE } from "@/lib/connectors/types";

describe("parseDevpostEnd", () => {
  it("parses same-year ranges", () => {
    expect(parseDevpostEnd("Aug 26 - Oct 30, 2026")?.toISOString()).toBe("2026-10-30T23:59:00.000Z");
  });
  it("parses ranges across a year boundary", () => {
    expect(parseDevpostEnd("Dec 28, 2026 - Jan 05, 2027")?.toISOString().slice(0, 10)).toBe("2027-01-05");
  });
  it("returns null for missing or garbage input", () => {
    expect(parseDevpostEnd(undefined)).toBeNull();
    expect(parseDevpostEnd("soon")).toBeNull();
  });
});

describe("classifyJob / SENIOR_RE", () => {
  it.each([
    ["Software Engineering Intern", "internship"],
    ["Quant Research Fellowship", "fellowship"],
    ["Research Engineer, Interpretability", "research"],
    ["Backend Engineer", "job"],
  ])("%s → %s", (title, type) => expect(classifyJob(title)).toBe(type));

  it("detects senior roles", () => {
    expect(SENIOR_RE.test("Staff Software Engineer")).toBe(true);
    expect(SENIOR_RE.test("Software Engineer, New Grad")).toBe(false);
  });
});

describe("mapDevpost", () => {
  it("maps prizes, themes, logo and online flag", () => {
    const o = mapDevpost({
      id: 42,
      title: " Build AI ",
      url: "https://x.devpost.com",
      thumbnail_url: "//img/x.png",
      displayed_location: { location: "Online" },
      submission_period_dates: "Oct 01 - Nov 04, 2026",
      themes: [{ name: "AI" }],
      prize_amount: "$<span>10,000</span>",
    });
    expect(o).toMatchObject({ externalId: "42", title: "Build AI", type: "hackathon", remote: true, orgLogo: "https://img/x.png", comp: "$10,000 in prizes", tags: ["AI"] });
    expect(o.deadline?.toISOString().slice(0, 10)).toBe("2026-11-04");
  });
});

describe("mapHackClub", () => {
  it("marks events as high-school, students-only with deadline at start", () => {
    const o = mapHackClub({ id: "h1", name: "HackNight", website: "https://h.club", start: "2026-11-10T10:00:00Z", end: "2026-11-11T10:00:00Z", virtual: true } as never);
    expect(o.rules).toMatchObject({ studentsOnly: true, degreeLevels: ["high_school"] });
    expect(o.deadline?.toISOString()).toBe("2026-11-10T10:00:00.000Z");
    expect(o.locations).toEqual(["Online"]);
  });
});

describe("mapUnstop", () => {
  it("maps a job's pay, cities and title-based type", () => {
    const job = {
      id: 9,
      title: "Graduate Engineer Trainee",
      type: "jobs",
      seo_url: "https://unstop.com/jobs/x",
      region: "online",
      regnRequirements: { eligibility: '{"sector":["corporates"]}' },
      locations: [{ city: "Pune", state: "Maharashtra", country: "India" }],
      jobDetail: { min_salary: 20000, max_salary: 40000, currency: "fa-rupee", show_salary: 1, not_disclosed: false, pay_in: "monthly", type: "in_office" },
    };
    expect(mapUnstop(job, "jobs")).toMatchObject({ type: "job", comp: "₹20,000–40,000/month", locations: ["Pune, Maharashtra, India"], remote: false });
    expect(mapUnstop({ ...job, title: "Data Analyst Intern", jobDetail: { ...job.jobDetail, type: "wfh" } }, "jobs")).toMatchObject({ type: "internship", remote: true, locations: ["Remote", "Pune, Maharashtra, India"] });
    expect(mapUnstop({ ...job, jobDetail: { ...job.jobDetail, not_disclosed: true } }, "jobs").comp).toBeNull();
    expect(mapUnstop({ ...job, jobDetail: { ...job.jobDetail, min_salary: 40000 } }, "jobs").comp).toBe("₹40,000/month");
  });

  it("maps registration deadline, prize total, team size and country", () => {
    const o = mapUnstop(
      {
        id: 7,
        title: "Code Sprint",
        type: "hackathons",
        seo_url: "https://unstop.com/x",
        details: "<p>Build &amp; ship</p>",
        region: "offline",
        organisation: { name: "IIT X" },
        regnRequirements: { end_regn_dt: "2026-11-20T23:59:00+05:30", eligibility: '{"sector":["students"]}', min_team_size: 1, max_team_size: 4 },
        prizes: [{ cash: 50000, currencyCode: "INR" }, { cash: 25000 }],
        address_with_country_logo: { city: "Delhi", country: { iso: "in", name: "India" } },
      },
      "hackathons",
    );
    expect(o).toMatchObject({ type: "hackathon", org: "IIT X", remote: false, description: "Build & ship", locations: ["Delhi", "India"] });
    expect(o.comp).toContain("75,000");
    expect(o.rules).toMatchObject({ studentsOnly: true, countries: ["IN"], teamSize: "1-4" });
    expect(o.deadline).toBeInstanceOf(Date);
  });
});

describe("Simplify", () => {
  const listing = {
    id: "s1",
    company_name: "Stripe",
    title: "SWE Intern",
    url: "https://boards.greenhouse.io/stripe/jobs/1",
    locations: ["Remote in USA"],
    active: true,
    is_visible: true,
    date_posted: 1_790_000_000,
    sponsorship: "U.S. Citizenship is Required",
    degrees: ["Bachelor's", "Master's"],
    category: "Software",
    terms: ["Summer 2027"],
  };

  it("derives structured rules", () => {
    expect(simplifyRules(listing)).toMatchObject({ degreeLevels: ["bachelors", "masters"], countries: ["US"] });
    expect(simplifyRules({ ...listing, sponsorship: "Does Not Offer Sponsorship" }).sponsorship).toBe("not_offered");
  });

  it("maps ATS, type and remote flag", () => {
    const o = mapSimplify(listing, "internships");
    expect(o).toMatchObject({ ats: "greenhouse", type: "internship", remote: true, org: "Stripe" });
    expect(o.postedAt?.getUTCFullYear()).toBe(2026);
  });
});

describe("ATS mappers", () => {
  it("maps Greenhouse with escaped HTML content", () => {
    const o = mapGreenhouse("stripe", "Stripe", {
      id: 1,
      title: "Software Engineer Intern",
      absolute_url: "https://stripe.com/jobs/1",
      location: { name: "Bengaluru" },
      content: "&lt;p&gt;Build payments&lt;/p&gt;",
      updated_at: "2026-10-01T00:00:00Z",
    } as never);
    expect(o).toMatchObject({ ats: "greenhouse", type: "internship", org: "Stripe" });
    expect(o.description).toContain("Build payments");
    expect(o.description).not.toContain("<p>");
  });

  it("maps Lever and Ashby postings", () => {
    const lever = mapLever("Palantir", {
      id: "l1",
      text: "Forward Deployed Engineer, New Grad",
      hostedUrl: "https://jobs.lever.co/palantir/l1",
      applyUrl: "https://jobs.lever.co/palantir/l1/apply",
      categories: { location: "London", commitment: "Full-time" },
      descriptionPlain: "Work with customers",
      createdAt: 1_790_000_000_000,
    } as never);
    expect(lever).toMatchObject({ ats: "lever", type: "job", org: "Palantir" });

    const ashby = mapAshby("OpenAI", {
      id: "a1",
      title: "Research Resident",
      jobUrl: "https://jobs.ashbyhq.com/openai/a1",
      applyUrl: "https://jobs.ashbyhq.com/openai/a1/application",
      location: "San Francisco",
      isRemote: false,
      descriptionPlain: "Research",
      publishedAt: "2026-10-01T00:00:00Z",
    } as never);
    expect(ashby).toMatchObject({ ats: "ashby", org: "OpenAI" });
  });
});

describe("MLH", () => {
  const event = {
    id: "e1",
    slug: "hackcbs",
    name: " hackCBS ",
    startsAt: "2026-10-31T12:00:00Z",
    endsAt: "2026-11-01T23:00:00Z",
    location: "New Delhi",
    formatType: "hybrid_physical",
    websiteUrl: "https://hackcbs.tech",
    region: "APAC",
  };

  it("names the season after the year it ends in", () => {
    expect(mlhSeason(new Date("2026-10-28T00:00:00Z"))).toBe(2027);
    expect(mlhSeason(new Date("2027-03-01T00:00:00Z"))).toBe(2027);
  });

  it("extracts upcoming events from the embedded page JSON", () => {
    const html = `<html><script data-page="app" type="application/json">${JSON.stringify({ props: { upcomingEvents: [event], pastEvents: [{}] } })}</script></html>`;
    expect(parseMlhEvents(html)).toHaveLength(1);
  });

  it("throws when the page layout changes, so source health shows it", () => {
    expect(() => parseMlhEvents("<html></html>")).toThrow(/layout changed/);
  });

  it("maps hybrid events with deadline at start and an MLH tag", () => {
    const o = mapMlh(event);
    expect(o).toMatchObject({ externalId: "e1", title: "hackCBS", url: "https://hackcbs.tech", remote: true, locations: ["New Delhi"], tags: ["MLH", "Hybrid", "APAC"] });
    expect(o.deadline?.toISOString()).toBe("2026-10-31T12:00:00.000Z");
  });

  it("falls back to the MLH event page without a website", () => {
    expect(mapMlh({ ...event, websiteUrl: undefined, formatType: "digital" })).toMatchObject({ url: "https://www.mlh.com/events/hackcbs", locations: ["Online"] });
  });
});

describe("mapDevfolio", () => {
  it("maps registration deadline, team size, themes and women-only rule", () => {
    const o = mapDevfolio({
      uuid: "u1",
      slug: "surat-hack",
      name: "Surat Hack",
      tagline: "Build AI agents.",
      starts_at: "2026-11-01T00:30:00Z",
      is_online: false,
      city: "Surat",
      country: "India",
      team_min: 1,
      team_size: 4,
      themes: [{ name: "AI" }],
      hackathon_setting: { reg_ends_at: "2026-10-28T18:30:00Z", women_only: true, logo: "https://l/x.png" },
    });
    expect(o).toMatchObject({ url: "https://surat-hack.devfolio.co/", locations: ["Surat, India"], remote: false, tags: ["AI", "Women only"], orgLogo: "https://l/x.png" });
    expect(o.rules).toMatchObject({ teamSize: "1-4", other: ["Women only"] });
    expect(o.deadline?.toISOString()).toBe("2026-10-28T18:30:00.000Z");
    expect(o.description).toContain("Women only.");
  });

  it("uses the external apply URL and start date when registration end is missing", () => {
    const o = mapDevfolio({ uuid: "u2", slug: "x", name: "X", starts_at: "2026-12-01T00:00:00Z", is_online: true, hackathon_setting: { external_apply_url: "https://apply.x" } });
    expect(o).toMatchObject({ applyUrl: "https://apply.x", locations: ["Online"], remote: true });
    expect(o.deadline?.toISOString().slice(0, 10)).toBe("2026-12-01");
  });
});
