import { htmlToText, parseDate, truncate } from "../text";
import { classifyJob, EARLY_CAREER_RE, fetchJson, SENIOR_RE, type Connector, type RawOpportunity } from "./types";

// Large-company career sites. Their searches are fuzzy ("intern" also finds "International Tax
// Manager"), so every listing must have an early-career title to be kept.

const politePause = () => new Promise((r) => setTimeout(r, 300));

// ---------- Workday: the public JSON behind {tenant}.{pod}.myworkdayjobs.com/{site} ----------

type WorkdayPosting = { title: string; externalPath: string; locationsText?: string; postedOn?: string; bulletFields?: string[] };

export type WorkdayBoard = {
  tenant: string;
  pod: string;
  site: string;
  org: string;
  /** Searches and an early-career title test, when the defaults don't fit the company's job titles. */
  queries?: string[];
  titleRe?: RegExp;
  /** Workday facet filters, e.g. { locationCountry: [<India's id>] }, plus the location they imply. */
  facets?: Record<string, string[]>;
  facetLocation?: string;
};

const WORKDAY_QUERIES = ["intern", "new grad", "university graduate"];
const WORKDAY_PAGE = 20; // Workday rejects larger pages
const WORKDAY_MAX_PAGES = 5;

export function mapWorkday(b: WorkdayBoard, p: WorkdayPosting): RawOpportunity | null {
  if (!(b.titleRe ?? EARLY_CAREER_RE).test(p.title) || (b.titleRe && SENIOR_RE.test(p.title))) return null;
  const url = `https://${b.tenant}.${b.pod}.myworkdayjobs.com/${b.site}${p.externalPath}`;
  // Some tenants put the location in bulletFields instead of locationsText.
  const place = p.locationsText ?? p.bulletFields?.slice(1).find((f) => /[a-z]/i.test(f)) ?? "";
  // A country facet means every result is in that country; say so for location matching.
  const location = b.facetLocation && !place.includes(b.facetLocation) ? [place, b.facetLocation].filter(Boolean).join(", ") : place;
  return {
    externalId: p.bulletFields?.[0] ?? p.externalPath,
    url,
    applyUrl: url,
    ats: "workday",
    type: classifyJob(p.title),
    title: p.title.trim(),
    org: b.org,
    locations: location ? [location] : [],
    remote: /remote/i.test(location),
    deadline: null,
    tags: [],
    // The search API returns no description, so this is all the judge has until a detail fetch exists.
    description: `${p.title.trim()} at ${b.org}.${location ? ` Location: ${location}.` : ""}${p.postedOn ? ` ${p.postedOn}.` : ""}`,
  };
}

export function workday(b: WorkdayBoard): Connector {
  return {
    id: `workday:${b.tenant}`,
    kind: "workday",
    label: `${b.org} careers`,
    fetch: async () => {
      const seen = new Map<string, RawOpportunity>();
      const endpoint = `https://${b.tenant}.${b.pod}.myworkdayjobs.com/wday/cxs/${b.tenant}/${b.site}/jobs`;
      for (const searchText of b.queries ?? WORKDAY_QUERIES) {
        for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
          const data = await fetchJson<{ jobPostings?: WorkdayPosting[] }>(endpoint, {
            body: { appliedFacets: b.facets ?? {}, limit: WORKDAY_PAGE, offset: page * WORKDAY_PAGE, searchText },
          });
          const posts = data.jobPostings ?? [];
          for (const p of posts) {
            const o = mapWorkday(b, p);
            if (o && !seen.has(o.externalId)) seen.set(o.externalId, o);
          }
          if (posts.length < WORKDAY_PAGE) break;
          await politePause();
        }
      }
      return [...seen.values()];
    },
  };
}

// ---------- Amazon (amazon.jobs search JSON) ----------

type AmazonJob = {
  id_icims: string;
  title: string;
  job_path: string;
  url_next_step?: string;
  normalized_location?: string;
  posted_date?: string;
  description?: string;
  basic_qualifications?: string;
  preferred_qualifications?: string;
  job_category?: string;
};

const AMAZON_QUERIES = ["intern", "new grad", "university"];
const AMAZON_PAGE = 100;
const AMAZON_MAX_PAGES = 3;

export function mapAmazon(j: AmazonJob): RawOpportunity | null {
  if (!EARLY_CAREER_RE.test(j.title)) return null;
  const url = `https://www.amazon.jobs${j.job_path}`;
  return {
    externalId: j.id_icims,
    url,
    applyUrl: j.url_next_step || url,
    ats: "amazon",
    type: classifyJob(j.title),
    title: j.title.trim(),
    org: "Amazon",
    locations: j.normalized_location ? [j.normalized_location] : [],
    remote: /virtual|remote/i.test(j.normalized_location ?? ""),
    deadline: null,
    postedAt: parseDate(j.posted_date),
    tags: j.job_category ? [j.job_category] : [],
    description: truncate(
      [
        htmlToText(j.description),
        j.basic_qualifications ? `Basic qualifications:\n${htmlToText(j.basic_qualifications)}` : "",
        j.preferred_qualifications ? `Preferred qualifications:\n${htmlToText(j.preferred_qualifications)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      8000,
    ),
  };
}

export const amazon: Connector = {
  id: "amazon",
  kind: "amazon",
  label: "Amazon students & graduates",
  fetch: async () => {
    const seen = new Map<string, RawOpportunity>();
    for (const q of AMAZON_QUERIES) {
      for (let page = 0; page < AMAZON_MAX_PAGES; page++) {
        const data = await fetchJson<{ jobs?: AmazonJob[] }>(
          `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q)}&result_limit=${AMAZON_PAGE}&offset=${page * AMAZON_PAGE}&sort=recent`,
        );
        const jobs = data.jobs ?? [];
        for (const j of jobs) {
          const o = mapAmazon(j);
          if (o && !seen.has(o.externalId)) seen.set(o.externalId, o);
        }
        if (jobs.length < AMAZON_PAGE) break;
        await politePause();
      }
    }
    return [...seen.values()];
  },
};
