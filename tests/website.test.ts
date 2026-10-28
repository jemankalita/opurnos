import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyText, detectBoards, feedLink, fromJsonLd, jsonLdNodes, parseFeed, scrapeWebsite, websiteSourceId } from "@/lib/connectors/website";
import { assertPublicUrl, isPrivateAddress, robotsAllows } from "@/lib/safe-fetch";

const PAGE = "https://example.org/careers";
const ld = (obj: unknown) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

describe("JSON-LD extraction", () => {
  it("flattens @graph and ItemList wrappers and skips broken blocks", () => {
    const html =
      ld({ "@graph": [{ "@type": "Organization", name: "X" }, { "@type": "JobPosting", title: "Intern" }] }) +
      ld({ "@type": "ItemList", itemListElement: [{ "@type": "ListItem", item: { "@type": "Event", name: "Hack Night" } }] }) +
      '<script type="application/ld+json">{ not json</script>';
    expect(jsonLdNodes(html).map((n) => n["@type"])).toEqual(["Organization", "JobPosting", "Event", "ItemList"]);
  });

  it("maps a JobPosting with deadline, org, remote and internship type", () => {
    const o = fromJsonLd(
      {
        "@type": "JobPosting",
        title: "Software Engineering Intern",
        url: "/jobs/42",
        hiringOrganization: { "@type": "Organization", name: "Acme", logo: "https://acme/logo.png" },
        jobLocationType: "TELECOMMUTE",
        jobLocation: { "@type": "Place", address: { addressLocality: "Pune", addressCountry: "IN" } },
        employmentType: "INTERN",
        validThrough: "2026-12-01T00:00:00Z",
        description: "&lt;p&gt;Build things&lt;/p&gt;",
      },
      PAGE,
    );
    expect(o).toMatchObject({ url: "https://example.org/jobs/42", org: "Acme", type: "internship", remote: true, locations: ["Remote", "Pune, IN"] });
    expect(o?.deadline?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(o?.description).toBe("Build things");
  });

  it("maps events (deadline at start) and programs (their own deadline)", () => {
    const ev = fromJsonLd({ "@type": "Event", name: "Spring Hackathon", startDate: "2027-03-01", eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode" }, PAGE);
    expect(ev).toMatchObject({ type: "hackathon", remote: true });
    expect(ev?.deadline?.toISOString().slice(0, 10)).toBe("2027-03-01");
    const prog = fromJsonLd({ "@type": "EducationalOccupationalProgram", name: "Research Fellows", applicationDeadline: "2027-01-15", provider: { name: "Uni" } }, PAGE);
    expect(prog).toMatchObject({ type: "fellowship", org: "Uni" });
    expect(prog?.deadline?.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("ignores types that aren't opportunities", () => {
    expect(fromJsonLd({ "@type": "Organization", name: "Acme" }, PAGE)).toBeNull();
  });
});

describe("classifyText", () => {
  it.each([
    ["Global Health Scholarship 2027", "scholarship"],
    ["Climate Fellowship", "fellowship"],
    ["Seed grants for students", "grant"],
    ["Summer Research Assistant", "research"],
    ["Robotics Challenge", "competition"],
    ["Data Science Intern", "internship"],
  ])("%s → %s", (title, type) => expect(classifyText(title)).toBe(type));
});

describe("detectBoards", () => {
  it("finds Greenhouse, Lever and Ashby boards linked from a careers page", () => {
    const html = `<a href="https://boards.greenhouse.io/acme/jobs/1">x</a><script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>
      <a href="https://jobs.lever.co/beta">y</a><a href="https://jobs.ashbyhq.com/gamma/abc">z</a>`;
    expect(detectBoards(html)).toEqual([
      { ats: "greenhouse", token: "acme" },
      { ats: "lever", token: "beta" },
      { ats: "ashby", token: "gamma" },
    ]);
  });
});

describe("feeds", () => {
  const rss = `<?xml version="1.0"?><rss><channel><title>Opportunity Desk</title>
    <item><title>Rhodes Scholarship 2027</title><link>https://od.org/rhodes</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Apply now</p>]]></description></item>
    <item><title>Our team retreat photos</title><link>https://od.org/photos</link></item>
  </channel></rss>`;

  it("keeps opportunity-like items and names the channel as org", () => {
    const items = parseFeed(rss, "https://od.org/feed");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Rhodes Scholarship 2027", type: "scholarship", org: "Opportunity Desk", url: "https://od.org/rhodes", description: "Apply now" });
  });

  it("strips unfilled template slots from titles", () => {
    const xml = `<rss><channel><title>Freshersworld</title><item><title>#!job_role!# Job Opening in Hikal Ltd at Mumbai</title><link>https://fw.com/1</link></item></channel></rss>`;
    expect(parseFeed(xml, "https://fw.com/feed")[0].title).toBe("Job Opening in Hikal Ltd at Mumbai");
  });

  it("finds an advertised feed", () => {
    expect(feedLink('<link rel="alternate" type="application/rss+xml" href="/feed/">', "https://od.org/blog")).toBe("https://od.org/feed/");
  });
});

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "treats %s as private",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "8.8.8.8", "2606:4700::1111"])("treats %s as public", (ip) => expect(isPrivateAddress(ip)).toBe(false));

  it.each([
    ["http://localhost:3000/", /standard web ports/],
    ["http://localhost/", /public internet/],
    ["http://169.254.169.254/latest/meta-data/", /public internet/],
    ["http://[::1]/", /public internet/],
    ["ftp://example.org/", /http and https/],
    ["https://user:pw@example.org/", /username or password/],
    ["not a url", /doesn't look like/],
  ])("rejects %s", async (url, message) => {
    await expect(assertPublicUrl(url)).rejects.toThrow(message);
  });
});

describe("robots.txt", () => {
  const robots = `User-agent: AhrefsBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nAllow: /private/jobs\n`;
  it("applies the * group, longest rule wins, and ignores other bots' groups", () => {
    expect(robotsAllows(robots, "/careers")).toBe(true);
    expect(robotsAllows(robots, "/private/team")).toBe(false);
    expect(robotsAllows(robots, "/private/jobs/1")).toBe(true);
  });
  it("respects a group naming our bot", () => {
    expect(robotsAllows("User-agent: OpurnosBot\nDisallow: /", "/anything")).toBe(false);
  });
});

describe("scrapeWebsite", () => {
  afterEach(() => vi.unstubAllGlobals());

  // An IP literal skips DNS, so the test stays offline.
  const SITE = "https://93.184.216.34/careers";

  function stubSite(routes: Record<string, () => Response>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) => {
        const route = routes[new URL(String(input)).pathname];
        return route ? route() : new Response("nope", { status: 404 });
      }),
    );
  }

  it("reads JSON-LD listings from an allowed page", async () => {
    stubSite({
      "/careers": () =>
        new Response(`<html>${ld({ "@type": "JobPosting", title: "New Grad Engineer", url: "/j/1", hiringOrganization: { name: "Acme" } })}</html>`, {
          headers: { "content-type": "text/html" },
        }),
    });
    const r = await scrapeWebsite(SITE);
    expect(r.methods).toEqual(["structured data"]);
    expect(r.items[0]).toMatchObject({ title: "New Grad Engineer", org: "Acme", url: "https://93.184.216.34/j/1" });
  });

  it("refuses pages robots.txt disallows", async () => {
    stubSite({ "/robots.txt": () => new Response("User-agent: *\nDisallow: /careers"), "/careers": () => new Response("<html></html>") });
    await expect(scrapeWebsite(SITE)).rejects.toThrow(/robots\.txt/);
  });

  it("does not follow a redirect into the private network", async () => {
    stubSite({ "/careers": () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }) });
    await expect(scrapeWebsite(SITE)).rejects.toThrow(/public internet/);
  });
});

describe("websiteSourceId", () => {
  it("is stable per URL and names the host", () => {
    expect(websiteSourceId("https://lu.ma/sf")).toBe(websiteSourceId("https://lu.ma/sf"));
    expect(websiteSourceId("https://lu.ma/sf")).toMatch(/^site:lu\.ma:[0-9a-f]{8}$/);
  });
});
