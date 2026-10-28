import { htmlToText, parseDate, truncate } from "../text";
import { classifyJob, fetchJson, type Connector, type RawOpportunity } from "./types";

const MAX_DESC = 8000;

// ---------- Greenhouse: boards-api.greenhouse.io/v1/boards/{token}/jobs ----------

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  application_deadline?: string | null;
  content?: string;
  departments?: { name: string }[];
};

export function mapGreenhouse(token: string, org: string, job: GreenhouseJob): RawOpportunity {
  const location = job.location?.name ?? "";
  return {
    externalId: String(job.id),
    url: job.absolute_url,
    applyUrl: job.absolute_url,
    ats: "greenhouse",
    type: classifyJob(job.title),
    title: job.title.trim(),
    org: job.company_name || org,
    orgLogo: null,
    locations: location ? location.split(/\s*[•;|]\s*/).filter(Boolean) : [],
    remote: /remote/i.test(location),
    deadline: parseDate(job.application_deadline),
    postedAt: parseDate(job.first_published ?? job.updated_at),
    tags: (job.departments ?? []).map((d) => d.name),
    description: truncate(htmlToText(job.content), MAX_DESC),
  };
}

export function greenhouse(token: string, org: string): Connector {
  return {
    id: `greenhouse:${token}`,
    kind: "greenhouse",
    label: `${org} (Greenhouse)`,
    fetch: async () => {
      const data = await fetchJson<{ jobs: GreenhouseJob[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      );
      return data.jobs.map((j) => mapGreenhouse(token, org, j));
    },
  };
}

// ---------- Lever: api.lever.co/v0/postings/{slug}?mode=json ----------

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; allLocations?: string[]; team?: string; commitment?: string };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
};

export function mapLever(org: string, p: LeverPosting): RawOpportunity {
  const locations = p.categories?.allLocations?.length ? p.categories.allLocations : p.categories?.location ? [p.categories.location] : [];
  const lists = (p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
  return {
    externalId: p.id,
    url: p.hostedUrl,
    applyUrl: p.applyUrl,
    ats: "lever",
    type: classifyJob(`${p.text} ${p.categories?.commitment ?? ""}`),
    title: p.text.trim(),
    org,
    locations,
    remote: p.workplaceType === "remote" || /remote/i.test(locations.join(" ")),
    deadline: null,
    postedAt: parseDate(p.createdAt),
    tags: [p.categories?.team, p.categories?.commitment].filter((t): t is string => Boolean(t)),
    description: truncate([p.descriptionPlain, lists, p.additionalPlain].filter(Boolean).join("\n\n"), MAX_DESC),
  };
}

export function lever(slug: string, org: string): Connector {
  return {
    id: `lever:${slug}`,
    kind: "lever",
    label: `${org} (Lever)`,
    fetch: async () => {
      const data = await fetchJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
      return data.map((p) => mapLever(org, p));
    },
  };
}

// ---------- Ashby: api.ashbyhq.com/posting-api/job-board/{name} ----------

type AshbyJob = {
  id: string;
  title: string;
  jobUrl: string;
  applyUrl: string;
  location?: string;
  secondaryLocations?: { location: string }[];
  isRemote?: boolean;
  isListed?: boolean;
  publishedAt?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  descriptionPlain?: string;
  compensation?: { compensationTierSummary?: string | null; scrapeableCompensationSalarySummary?: string | null };
};

export function mapAshby(org: string, j: AshbyJob): RawOpportunity {
  const locations = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter((l): l is string => Boolean(l));
  return {
    externalId: j.id,
    url: j.jobUrl,
    applyUrl: j.applyUrl,
    ats: "ashby",
    type: j.employmentType === "Intern" ? "internship" : classifyJob(j.title),
    title: j.title.trim(),
    org,
    locations,
    remote: Boolean(j.isRemote),
    deadline: null,
    postedAt: parseDate(j.publishedAt),
    comp: j.compensation?.compensationTierSummary ?? j.compensation?.scrapeableCompensationSalarySummary ?? null,
    tags: [j.department, j.team].filter((t): t is string => Boolean(t)),
    description: truncate(j.descriptionPlain ?? "", MAX_DESC),
  };
}

export function ashby(name: string, org: string): Connector {
  return {
    id: `ashby:${name}`,
    kind: "ashby",
    label: `${org} (Ashby)`,
    fetch: async () => {
      const data = await fetchJson<{ jobs: AshbyJob[] }>(
        `https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`,
      );
      return data.jobs.filter((j) => j.isListed !== false).map((j) => mapAshby(org, j));
    },
  };
}

// ---------- SmartRecruiters: api.smartrecruiters.com/v1/companies/{id}/postings (public Posting API) ----------

type SmartRecruitersPosting = {
  id: string;
  name: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: { fullLocation?: string; city?: string; country?: string; remote?: boolean; hybrid?: boolean };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { id?: string; label?: string };
  function?: { label?: string };
  department?: { label?: string };
};

export function mapSmartRecruiters(company: string, org: string, p: SmartRecruitersPosting): RawOpportunity {
  const url = `https://jobs.smartrecruiters.com/${company}/${p.id}`;
  const level = p.experienceLevel?.id;
  const tags = [p.function?.label, p.department?.label, p.typeOfEmployment?.label, level === "not_applicable" ? "" : p.experienceLevel?.label].filter(
    (t): t is string => Boolean(t),
  );
  // fullLocation leaves gaps when a region is missing ("bangalore, , India").
  const place = (p.location?.fullLocation ?? [p.location?.city, p.location?.country?.toUpperCase()].join(","))
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
  return {
    externalId: p.id,
    url,
    applyUrl: url,
    ats: "smartrecruiters",
    type: level === "internship" ? "internship" : classifyJob(p.name),
    title: p.name.trim(),
    org: p.company?.name && p.company.name !== p.company.name.toUpperCase() ? p.company.name : org,
    orgLogo: null,
    locations: [p.location?.remote ? "Remote" : "", place].filter(Boolean),
    remote: Boolean(p.location?.remote),
    deadline: null,
    postedAt: parseDate(p.releasedDate),
    tags,
    // The list endpoint has no job description; fetching each posting would be one request per job.
    description: [p.name, ...tags, place].filter(Boolean).join(" · "),
  };
}

const SR_PAGE = 100;

/** `country` is an ISO code; boards like Bosch's list thousands of roles worldwide. */
export function smartRecruiters(company: string, org: string, country?: string, maxPages = 5): Connector {
  return {
    id: `smartrecruiters:${company.toLowerCase()}${country ? `:${country}` : ""}`,
    kind: "smartrecruiters",
    label: `${org} (SmartRecruiters${country ? `, ${country.toUpperCase()}` : ""})`,
    fetch: async () => {
      const out: RawOpportunity[] = [];
      for (let page = 0; page < maxPages; page++) {
        const q = new URLSearchParams({ limit: String(SR_PAGE), offset: String(page * SR_PAGE), ...(country ? { country } : {}) });
        const data = await fetchJson<{ totalFound: number; content: SmartRecruitersPosting[] }>(
          `https://api.smartrecruiters.com/v1/companies/${company}/postings?${q}`,
        );
        out.push(...data.content.map((p) => mapSmartRecruiters(company, org, p)));
        if ((page + 1) * SR_PAGE >= data.totalFound) break;
      }
      return out;
    },
  };
}
