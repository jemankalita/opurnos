import { ashby, greenhouse, lever, smartRecruiters } from "./ats";
import { hnHiring, remoteOk } from "./boards";
import { codechef, codeforces } from "./contests";
import { amazon, workday, type WorkdayBoard } from "./careers";
import { devfolio, devpost, ethglobal, hackclub, hackerearth, mlh, unstop } from "./hackathons";
import { curated, gsoc, outreachy } from "./programs";
import { simplify } from "./simplify";
import type { Connector } from "./types";
import { websiteConnector } from "./website";

// Seed companies: AI labs, quant firms and high-growth tech with public ATS boards.
// Each was verified to return listings on 2026-10-27 (Vercel, Perplexity, Notion on 2026-10-28).
// Not Jane Street: its board swaps letters for Unicode lookalikes, which reads as an opt-out from scraping.
const GREENHOUSE: Array<[string, string]> = [
  ["anthropic", "Anthropic"],
  ["stripe", "Stripe"],
  ["databricks", "Databricks"],
  ["figma", "Figma"],
  ["wehrtyou", "Hudson River Trading"],
  ["imc", "IMC Trading"],
  ["jumptrading", "Jump Trading"],
  ["scaleai", "Scale AI"],
  ["discord", "Discord"],
  ["vercel", "Vercel"],
  // Added 2026-10-28: boards with 2027 internships or new-grad roles.
  ["togetherai", "Together AI"],
  ["pinterest", "Pinterest"],
  ["coinbase", "Coinbase"],
  ["duolingo", "Duolingo"],
  ["akunacapital", "Akuna Capital"],
  ["point72", "Point72"],
  ["lyft", "Lyft"],
  ["cloudflare", "Cloudflare"],
  ["datadog", "Datadog"],
  ["mongodb", "MongoDB"],
  ["affirm", "Affirm"],
  ["neuralink", "Neuralink"],
  ["waymo", "Waymo"],
  ["nuro", "Nuro"],
  ["airbnb", "Airbnb"],
  // Added 2026-10-28 for Indian users: Indian companies, or most open roles in India.
  ["groww", "Groww"],
  ["highradius", "HighRadius"],
  ["inmobi", "InMobi"],
  ["druva", "Druva"],
  ["zscaler", "Zscaler"],
  ["okta", "Okta"],
  ["gitlab", "GitLab"],
  ["elastic", "Elastic"],
];
const LEVER: Array<[string, string]> = [
  ["palantir", "Palantir"],
  ["cred", "CRED"],
  ["mindtickle", "Mindtickle"],
  ["zeta", "Zeta"],
];
const ASHBY: Array<[string, string]> = [
  ["openai", "OpenAI"],
  ["ramp", "Ramp"],
  ["linear", "Linear"],
  ["cursor", "Cursor"],
  ["perplexity", "Perplexity"],
  ["notion", "Notion"],
  ["cohere", "Cohere"],
  ["modal", "Modal"],
  ["replit", "Replit"],
  ["sierra", "Sierra"],
  ["harvey", "Harvey"],
  ["decagon", "Decagon"],
  ["pika", "Pika"],
  ["physicalintelligence", "Physical Intelligence"],
  ["sarvam", "Sarvam AI"],
  ["atlan", "Atlan"],
];
// Workday tenants whose public job search was verified on 2026-10-28.
const WORKDAY: WorkdayBoard[] = [
  { tenant: "nvidia", pod: "wd5", site: "NVIDIAExternalCareerSite", org: "NVIDIA" },
  { tenant: "adobe", pod: "wd5", site: "external_experienced", org: "Adobe" },
  { tenant: "intel", pod: "wd1", site: "External", org: "Intel" },
  { tenant: "salesforce", pod: "wd12", site: "External_Career_Site", org: "Salesforce" },
  { tenant: "snapchat", pod: "wd1", site: "snap", org: "Snap" },
  { tenant: "cisco", pod: "wd5", site: "Cisco_Careers", org: "Cisco" },
  { tenant: "boeing", pod: "wd1", site: "EXTERNAL_CAREERS", org: "Boeing" },
  { tenant: "capitalone", pod: "wd12", site: "Capital_One", org: "Capital One" },
  { tenant: "mastercard", pod: "wd1", site: "CorporateCareers", org: "Mastercard" },
  // Accenture India's fresher roles are "New Associate" / "Associate" titles, not "intern" or "new grad".
  {
    tenant: "accenture",
    pod: "wd103",
    site: "AccentureCareers",
    org: "Accenture",
    queries: ["new associate", "fresher", "associate software engineer"],
    titleRe: /\b(new assoc(iate)?|fresher|trainee|graduate|associate software engineer|engineering associate|development associate)\b/i,
    facets: { locationCountry: ["c4f78be1a8f14da0ab49ce1162348a5e"] }, // India
    facetLocation: "India",
  },
];

// SmartRecruiters boards, India roles only. Verified 2026-10-28 (open roles in India in brackets).
const SMARTRECRUITERS: Array<[string, string]> = [
  ["Swiggy", "Swiggy"], // 207
  ["BoschGroup", "Bosch"], // 612
  ["ServiceNow", "ServiceNow"], // 79
  ["Freshworks", "Freshworks"], // 32
  ["Experian", "Experian"], // 33
];

// RSS feeds for Indian students and freshers, read by the same scraper as user-added sites
// (robots.txt and the SSRF guard apply). Most Indian job portals block bots or render listings
// in the browser, so these feeds are what's readable. Verified 2026-10-28.
const FEEDS = [
  { id: "feed:scholarshipsinindia", url: "https://www.scholarshipsinindia.com/feed", label: "Scholarships in India" },
  { id: "feed:freshersworld", url: "https://www.freshersworld.com/jobs", label: "Freshersworld" },
  { id: "feed:opportunitiescorners", url: "https://www.opportunitiescorners.com/feed/", label: "Opportunities Corners" },
];

export function allConnectors(): Connector[] {
  return [
    devpost,
    hackclub,
    mlh,
    devfolio,
    ethglobal,
    hackerearth,
    gsoc,
    outreachy,
    curated,
    hnHiring,
    remoteOk,
    unstop("hackathons"),
    unstop("internships"),
    // ~840 open jobs; 10 pages of 30 keeps the run under a minute.
    unstop("jobs", 10),
    unstop("scholarships"),
    unstop("competitions"),
    simplify("internships"),
    simplify("newgrad"),
    simplify("community"),
    amazon,
    ...WORKDAY.map(workday),
    ...GREENHOUSE.map(([t, n]) => greenhouse(t, n)),
    ...LEVER.map(([s, n]) => lever(s, n)),
    ...ASHBY.map(([s, n]) => ashby(s, n)),
    ...SMARTRECRUITERS.map(([c, n]) => smartRecruiters(c, n, "in")),
    codeforces,
    codechef,
    // kind "feed", not "website": website sources are the ones users add and can remove.
    ...FEEDS.map((f) => ({ ...websiteConnector(f), kind: "feed" })),
  ];
}

export type { Connector, RawOpportunity } from "./types";
