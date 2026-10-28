import type { OpportunityType } from "../schemas";
import { isAllowedByRobots, safeFetch } from "../safe-fetch";
import { decodeEntities, htmlToText, parseDate, sha1, truncate } from "../text";
import { ashby, greenhouse, lever } from "./ats";
import { classifyJob, type Connector, type RawOpportunity } from "./types";

// "Watch any website": turns a page someone pastes in into a source, without an LLM.
// 1. schema.org JSON-LD (JobPosting, Event, EducationalOccupationalProgram), which most career and
//    event sites embed so Google can show them in search results.
// 2. Links to a Greenhouse, Lever or Ashby board, handed to the existing connectors.
// 3. An RSS or Atom feed (the page itself, or one it advertises), keeping opportunity-like items.

export type ScrapeMethod = "structured data" | "job board" | "feed";
export type ScrapeResult = { items: RawOpportunity[]; methods: ScrapeMethod[] };

const MAX_ITEMS = 300;
const MAX_BOARDS = 3;

type Json = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : v == null ? [] : [v as T]);
const nameOf = (v: unknown): string => (typeof v === "string" ? v : str((v as Json | null)?.name));
const clean = (html: string) => htmlToText(decodeEntities(html)).trim();

/** Keyword typing for listings that aren't jobs. */
export function classifyText(title: string, body = ""): OpportunityType {
  const t = `${title} ${body.slice(0, 400)}`;
  if (/hackathon|hack ?day|buildathon/i.test(t)) return "hackathon";
  if (/scholarship|bursary|tuition award/i.test(t)) return "scholarship";
  if (/fellowship|fellows program|residency/i.test(t)) return "fellowship";
  if (/\bgrants?\b|funding call|call for proposals/i.test(t)) return "grant";
  if (/research (assistant|position|internship)|\bphd\b|postdoc|\bREU\b/i.test(t)) return "research";
  if (/competition|challenge|olympiad|contest/i.test(t)) return "competition";
  if (/conference|summit|symposium|workshop/i.test(t)) return "conference";
  return classifyJob(title);
}

function placeOf(v: unknown): string {
  for (const p of arr<Json | string>(v)) {
    if (typeof p === "string") return p;
    if (p?.["@type"] === "VirtualLocation") return "Online";
    const a = p?.address;
    if (typeof a === "string") return a;
    const parts = [str((a as Json)?.addressLocality), str((a as Json)?.addressRegion), nameOf((a as Json)?.addressCountry)].filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (p?.name) return str(p.name);
  }
  return "";
}

/** Every JSON-LD object on the page, with @graph and ItemList wrappers flattened. */
export function jsonLdNodes(html: string): Json[] {
  const out: Json[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const node = v as Json;
      if (node["@graph"]) visit(node["@graph"]);
      if (node.itemListElement) visit(arr(node.itemListElement).map((e) => (e as Json)?.item ?? e));
      if (node["@type"]) out.push(node);
    }
  };
  for (const [, body] of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(body.trim()));
    } catch {
      // A broken block on someone else's page shouldn't stop us reading the others.
    }
  }
  return out;
}

export function fromJsonLd(node: Json, pageUrl: string): RawOpportunity | null {
  const types = arr<string>(node["@type"]).map(String);
  const url = new URL(str(node.url) || pageUrl, pageUrl).toString();
  const description = truncate(clean(str(node.description)), 6000);

  if (types.includes("JobPosting")) {
    const title = clean(str(node.title) || str(node.name));
    if (!title) return null;
    const remote = arr(node.jobLocationType).some((t) => /telecommute/i.test(String(t)));
    const place = placeOf(node.jobLocation) || nameOf(arr(node.applicantLocationRequirements)[0]);
    const intern = arr(node.employmentType).some((t) => /intern/i.test(String(t)));
    const org = node.hiringOrganization as Json | string | undefined;
    return {
      externalId: str((node.identifier as Json | undefined)?.value) || (url === pageUrl ? sha1(title) : url),
      url,
      applyUrl: url,
      ats: "website",
      type: intern ? "internship" : classifyJob(title),
      title,
      org: nameOf(org) || new URL(pageUrl).hostname,
      orgLogo: typeof org === "object" ? str(org?.logo) || null : null,
      locations: [remote ? "Remote" : "", place].filter(Boolean),
      remote,
      deadline: parseDate(node.validThrough),
      postedAt: parseDate(node.datePosted),
      tags: arr(node.employmentType).map(String),
      description,
    };
  }

  const isEvent = types.some((t) => /Event$/.test(t));
  const isProgram = types.some((t) => /EducationalOccupationalProgram|Scholarship|Grant/.test(t));
  if (!isEvent && !isProgram) return null;
  const title = clean(str(node.name));
  if (!title) return null;
  const startsAt = parseDate(node.startDate);
  const type = classifyText(title, description);
  return {
    externalId: url === pageUrl ? sha1(title) : url,
    url,
    applyUrl: url,
    ats: "website",
    type: type !== "job" ? type : isEvent ? "conference" : "fellowship",
    title,
    org: nameOf(node.organizer) || nameOf(node.provider) || nameOf(node.funder) || new URL(pageUrl).hostname,
    locations: [placeOf(node.location)].filter(Boolean),
    remote: /Online/i.test(str(node.eventAttendanceMode)) || placeOf(node.location) === "Online",
    // Events close to new registrations when they start; programs state their own deadline.
    deadline: parseDate(node.applicationDeadline) ?? startsAt,
    startsAt,
    tags: [],
    description,
  };
}

// ---------- Job boards linked from a careers page ----------

export type BoardLink = { ats: "greenhouse" | "lever" | "ashby"; token: string };

export function detectBoards(html: string): BoardLink[] {
  const found = new Map<string, BoardLink>();
  const patterns: [BoardLink["ats"], RegExp][] = [
    ["greenhouse", /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/gi],
    ["lever", /jobs\.lever\.co\/([a-z0-9_-]+)/gi],
    ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/gi],
  ];
  for (const [ats, re] of patterns) {
    for (const [, token] of html.matchAll(re)) {
      if (["embed", "api", "v1"].includes(token.toLowerCase())) continue;
      found.set(`${ats}:${token.toLowerCase()}`, { ats, token });
    }
  }
  return [...found.values()].slice(0, MAX_BOARDS);
}

function boardConnector(b: BoardLink, org: string): Connector {
  return b.ats === "greenhouse" ? greenhouse(b.token, org) : b.ats === "lever" ? lever(b.token, org) : ashby(b.token, org);
}

// ---------- RSS / Atom ----------

const OPPORTUNITY_WORDS = /fellowship|scholarship|grant|hackathon|intern|residency|call for|applications? (open|due)|apply|deadline|competition|challenge|program(me)?|position|hiring|job/i;

const tag = (xml: string, name: string) =>
  xml
    .match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1]
    ?.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "")
    .trim() ?? "";

export function isFeed(contentType: string, body: string): boolean {
  return /(rss|atom)\+xml|\/xml/i.test(contentType) || /^\s*(<\?xml[^>]*>\s*)?<(rss|feed)\b/i.test(body);
}

export function parseFeed(xml: string, feedUrl: string): RawOpportunity[] {
  const channelTitle = clean(tag(xml.split(/<(?:item|entry)\b/i)[0], "title"));
  const out: RawOpportunity[] = [];
  for (const [entry] of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
    // Some feeds ship unfilled template slots, e.g. Freshersworld's "#!job_role!# Job Opening in ...".
    const title = clean(tag(entry, "title")).replace(/#!\w+!#|\{\{[^}]*\}\}/g, "").replace(/\s+/g, " ").trim();
    const link = tag(entry, "link") || entry.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || "";
    const body = clean(tag(entry, "description") || tag(entry, "summary") || tag(entry, "content"));
    if (!title || !link || !OPPORTUNITY_WORDS.test(`${title} ${body.slice(0, 300)}`)) continue;
    const url = new URL(decodeEntities(link), feedUrl).toString();
    out.push({
      externalId: url,
      url,
      applyUrl: url,
      ats: "website",
      type: classifyText(title, body),
      title,
      org: channelTitle || new URL(feedUrl).hostname,
      locations: [],
      remote: false,
      deadline: null,
      postedAt: parseDate(tag(entry, "pubDate") || tag(entry, "published") || tag(entry, "updated")),
      tags: [],
      description: truncate(body, 6000),
    });
  }
  return out;
}

export function feedLink(html: string, pageUrl: string): string | null {
  const el = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i)?.[0];
  const href = el?.match(/href=["']([^"']+)["']/i)?.[1];
  return href ? new URL(decodeEntities(href), pageUrl).toString() : null;
}

// ---------- Putting it together ----------

/** The site's own name, e.g. "Linear" rather than "linear.app". */
export function siteName(html: string): string {
  const el = html.match(/<meta[^>]+property=["']og:site_name["'][^>]*>/i)?.[0];
  return decodeEntities(el?.match(/content=["']([^"']+)["']/i)?.[1] ?? "").trim();
}

async function fetchAllowed(url: string) {
  if (!(await isAllowedByRobots(url))) throw new Error("This site's robots.txt asks bots not to read that page.");
  const res = await safeFetch(url);
  if (res.status >= 400) throw new Error(`The site answered with HTTP ${res.status}.`);
  return res;
}

export async function scrapeWebsite(pageUrl: string): Promise<ScrapeResult> {
  const page = await fetchAllowed(pageUrl);
  const methods = new Set<ScrapeMethod>();
  const items = new Map<string, RawOpportunity>();
  const add = (list: RawOpportunity[], method: ScrapeMethod) => {
    for (const o of list) if (items.size < MAX_ITEMS && !items.has(o.externalId)) items.set(o.externalId, o);
    if (list.length) methods.add(method);
  };

  if (isFeed(page.contentType, page.body)) {
    add(parseFeed(page.body, page.url), "feed");
    return { items: [...items.values()], methods: [...methods] };
  }

  const org = siteName(page.body) || new URL(page.url).hostname.replace(/^(www|careers|jobs)\./, "");
  const structured = jsonLdNodes(page.body)
    .map((n) => fromJsonLd(n, page.url))
    .filter((o): o is RawOpportunity => o !== null)
    // fromJsonLd falls back to the hostname when a listing names no organisation.
    .map((o) => (o.org === new URL(page.url).hostname ? { ...o, org } : o));
  add(structured, "structured data");

  // Board tokens match [a-z0-9_-] only, and the board APIs live on fixed hosts, so no SSRF surface here.
  for (const board of detectBoards(page.body)) add(await boardConnector(board, org).fetch().catch(() => []), "job board");

  if (items.size === 0) {
    const feed = feedLink(page.body, page.url);
    const res = feed ? await fetchAllowed(feed).catch(() => null) : null;
    if (res) add(parseFeed(res.body, res.url), "feed");
  }
  return { items: [...items.values()], methods: [...methods] };
}

export function websiteSourceId(url: string): string {
  const u = new URL(url);
  return `site:${u.hostname}:${sha1(u.toString()).slice(0, 8)}`;
}

export function websiteConnector(s: { id: string; url: string; label: string }): Connector {
  return { id: s.id, kind: "website", label: s.label, fetch: async () => (await scrapeWebsite(s.url)).items };
}
