import { decodeEntities, htmlToText, parseDate, truncate } from "../text";
import { classifyJob, EARLY_CAREER_RE, fetchJson, SENIOR_RE, type Connector, type RawOpportunity } from "./types";

// ---------- Hacker News "Ask HN: Who is hiring?" (monthly thread, via the Algolia HN API) ----------

type HnComment = { id: number; created_at: string; text: string | null; children?: HnComment[] };

const INTERN_RE = /\binterns?(hips?)?\b/i;
const NOT_A_PLACE_RE = /https?:|\$|€|£|\d{2,}k|full[- ]?time|part[- ]?time|contract|visa/i;

const ROLE_RE = /\b(engineer|developer|interns?(hips?)?|scientist|designer|analyst|researcher|grad|roles?|positions?|swe|sre|ml|full[- ]?stack|backend|frontend)\b/i;

/** Posts follow the convention "Company | Role | Location | ..." on the first line. */
export function mapHnPost(c: HnComment): RawOpportunity | null {
  if (!c.text || !EARLY_CAREER_RE.test(c.text)) return null;
  const header = decodeEntities(c.text.split(/<p>/i)[0].replace(/<[^>]+>/g, "")).trim();
  const parts = header.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const [company, ...rest] = parts;
  const role = rest.find((p) => ROLE_RE.test(p) && !/https?:/.test(p)) ?? "Open roles";
  const locations = rest.filter((p) => p !== role && !NOT_A_PLACE_RE.test(p) && !EARLY_CAREER_RE.test(p) && p.length < 60);
  const link = c.text.match(/href="([^"]+)"/)?.[1];
  const thread = `https://news.ycombinator.com/item?id=${c.id}`;
  return {
    externalId: String(c.id),
    url: thread,
    applyUrl: link ? decodeEntities(link) : thread,
    ats: "hn",
    type: INTERN_RE.test(c.text) ? "internship" : classifyJob(role),
    title: role,
    org: company,
    locations,
    remote: /\bremote\b/i.test(header),
    deadline: null,
    postedAt: parseDate(c.created_at),
    tags: ["HN Who is hiring"],
    description: truncate(htmlToText(c.text), 6000),
  };
}

export const hnHiring: Connector = {
  id: "hn:whoishiring",
  kind: "hn",
  label: "HN Who is hiring (early career)",
  fetch: async () => {
    const search = await fetchJson<{ hits: { objectID: string; title: string }[] }>(
      "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5",
    );
    const thread = search.hits.find((h) => h.title.startsWith("Ask HN: Who is hiring?"));
    if (!thread) throw new Error("No current Who is hiring thread");
    const item = await fetchJson<HnComment>(`https://hn.algolia.com/api/v1/items/${thread.objectID}`);
    return (item.children ?? []).map(mapHnPost).filter((o): o is RawOpportunity => o !== null);
  },
};

// ---------- Remote OK (public API; terms require a followed link back naming Remote OK) ----------

type RemoteOkJob = {
  id?: string;
  legal?: string;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
};

// Remote OK lists every kind of remote job, and its tags are noisy ("dev" on sales roles); judge by title.
const TECH_TITLE_RE = /\b(engineer(ing)?|developer|programmer|designer|data|scientist|machine learning|ml|ai|devops|sre|qa|tester|security|frontend|backend|full[- ]?stack|software)\b/i;

/** Remote OK serves some UTF-8 text decoded as Latin-1 ("â€™"); undo that when it round-trips cleanly. */
export function fixMojibake(input: string): string {
  if (!/[ÂÃâ]/.test(input)) return input;
  const fixed = Buffer.from(input, "latin1").toString("utf8");
  return fixed.includes("�") ? input : fixed;
}

export function mapRemoteOk(j: RemoteOkJob): RawOpportunity | null {
  if (!j.id || !j.position || !j.url || SENIOR_RE.test(j.position)) return null;
  if (!TECH_TITLE_RE.test(j.position)) return null;
  const salary = j.salary_min && j.salary_max ? `$${j.salary_min.toLocaleString("en-US")}–$${j.salary_max.toLocaleString("en-US")}` : null;
  return {
    externalId: j.id,
    url: j.url,
    applyUrl: j.url,
    ats: "remoteok",
    type: classifyJob(j.position),
    title: fixMojibake(j.position).trim(),
    org: fixMojibake(j.company ?? "Unknown company").trim(),
    orgLogo: j.company_logo || null,
    locations: [j.location || "Remote"],
    remote: true,
    deadline: null,
    postedAt: parseDate(j.date),
    comp: salary,
    tags: [...(j.tags ?? []).slice(0, 6), "via Remote OK"],
    description: truncate(`Listed on Remote OK. ${htmlToText(fixMojibake(j.description ?? ""))}`, 6000),
  };
}

export const remoteOk: Connector = {
  id: "remoteok",
  kind: "remoteok",
  label: "Remote OK",
  fetch: async () => {
    const data = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api");
    return data.filter((j) => !j.legal).map(mapRemoteOk).filter((o): o is RawOpportunity => o !== null);
  },
};
