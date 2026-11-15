import { htmlToText, parseDate, truncate } from "../text";
import { classifyJob, fetchJson, type Connector, type RawOpportunity } from "./types";

const MAX_DESC = 8000;

// Public, unauthenticated career-page APIs used by the same job boards as Greenhouse and Lever.
// Field notes: https://github.com/Mersetti/ats-job-board-apis (checked 2026-11).

function money(amount: string | null | undefined): string | null {
  const text = amount?.trim();
  return text ? text : null;
}

// ---------- Workable: apply.workable.com/api/v1/widget/accounts/{slug} ----------

type WorkableLocation = string | { city?: string | null; region?: string | null; country?: string | null; country_code?: string | null };

type WorkableJob = {
  title?: string;
  shortcode?: string;
  employment_type?: string | null;
  telecommuting?: boolean;
  department?: string | null;
  url?: string;
  application_url?: string;
  published_on?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  locations?: WorkableLocation[];
  description?: string | null;
};

function workablePlaces(job: WorkableJob): string[] {
  const fromList = (job.locations ?? [])
    .map((loc) => (typeof loc === "string" ? loc : [loc.city, loc.region, loc.country].filter(Boolean).join(", ")))
    .filter(Boolean);
  if (fromList.length) return fromList;
  const one = [job.city, job.state, job.country].filter(Boolean).join(", ");
  return one ? [one] : [];
}

export function mapWorkable(org: string, job: WorkableJob): RawOpportunity | null {
  if (!job.shortcode || !job.title || !job.url) return null;
  const places = workablePlaces(job);
  return {
    externalId: job.shortcode,
    url: job.url,
    applyUrl: job.application_url || job.url,
    ats: "workable",
    type: /intern/i.test(job.employment_type ?? "") ? "internship" : classifyJob(job.title),
    title: job.title.trim(),
    org,
    locations: places,
    remote: Boolean(job.telecommuting) || places.some((p) => /remote/i.test(p)),
    deadline: null,
    postedAt: parseDate(job.published_on),
    tags: job.department ? [job.department] : [],
    description: truncate(htmlToText(job.description) || job.title, MAX_DESC),
  };
}

export function workable(slug: string, org: string): Connector {
  return {
    id: `workable:${slug}`,
    kind: "workable",
    label: `${org} (Workable)`,
    fetch: async () => {
      const data = await fetchJson<{ name?: string; jobs?: WorkableJob[] }>(
        `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`,
      );
      return (data.jobs ?? []).flatMap((job) => {
        const mapped = mapWorkable(data.name || org, job);
        return mapped ? [mapped] : [];
      });
    },
  };
}

// ---------- Recruitee: {slug}.recruitee.com/api/offers/ ----------

type RecruiteeOffer = {
  id?: number;
  title?: string;
  department?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  remote?: boolean;
  hybrid?: boolean;
  employment_type_code?: string | null;
  published_at?: string | null;
  careers_url?: string;
  careers_apply_url?: string | null;
  description?: string | null;
  requirements?: string | null;
  salary?: { min?: number | null; max?: number | null; period?: string | null; currency?: string | null } | null;
};

function recruiteeWhen(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDate(value.replace(" UTC", "Z").replace(" ", "T"));
}

function recruiteePay(salary: RecruiteeOffer["salary"]): string | null {
  if (!salary || (salary.min == null && salary.max == null)) return null;
  const range = salary.min != null && salary.max != null && salary.min !== salary.max ? `${salary.min}–${salary.max}` : String(salary.min ?? salary.max);
  return money([salary.currency, range, salary.period].filter(Boolean).join(" "));
}

export function mapRecruitee(org: string, offer: RecruiteeOffer): RawOpportunity | null {
  if (offer.id == null || !offer.title || !offer.careers_url) return null;
  const place = offer.location || [offer.city, offer.country].filter(Boolean).join(", ");
  return {
    externalId: String(offer.id),
    url: offer.careers_url,
    applyUrl: offer.careers_apply_url || offer.careers_url,
    ats: "recruitee",
    type: /intern/i.test(offer.employment_type_code ?? "") ? "internship" : classifyJob(offer.title),
    title: offer.title.trim(),
    org,
    locations: [offer.remote ? "Remote" : "", place].filter(Boolean),
    remote: Boolean(offer.remote),
    deadline: null,
    postedAt: recruiteeWhen(offer.published_at),
    comp: recruiteePay(offer.salary),
    tags: [offer.department, offer.hybrid ? "Hybrid" : ""].filter((t): t is string => Boolean(t)),
    description: truncate([htmlToText(offer.description), htmlToText(offer.requirements)].filter(Boolean).join("\n\n") || offer.title, MAX_DESC),
  };
}

export function recruitee(slug: string, org: string): Connector {
  return {
    id: `recruitee:${slug}`,
    kind: "recruitee",
    label: `${org} (Recruitee)`,
    fetch: async () => {
      const data = await fetchJson<{ offers?: RecruiteeOffer[] }>(`https://${slug}.recruitee.com/api/offers/`);
      return (data.offers ?? []).flatMap((offer) => {
        const mapped = mapRecruitee(org, offer);
        return mapped ? [mapped] : [];
      });
    },
  };
}

// ---------- Rippling: ats.rippling.com/api/v2/board/{slug}/jobs ----------

type RipplingJob = {
  id?: string;
  name?: string;
  url?: string;
  department?: { name?: string | null } | null;
  locations?: { name?: string | null; city?: string | null; country?: string | null }[];
};

const RIPPLING_PAGE = 20;
const RIPPLING_MAX_PAGES = 5;

export function mapRippling(org: string, job: RipplingJob): RawOpportunity | null {
  if (!job.id || !job.name || !job.url) return null;
  const places = (job.locations ?? [])
    .map((loc) => loc.name || [loc.city, loc.country].filter(Boolean).join(", "))
    .filter(Boolean);
  const department = job.department?.name ?? "";
  return {
    externalId: job.id,
    url: job.url,
    applyUrl: job.url,
    ats: "rippling",
    type: classifyJob(job.name),
    title: job.name.trim(),
    org,
    locations: places,
    remote: places.some((p) => /remote/i.test(p)),
    deadline: null,
    postedAt: null,
    tags: department ? [department] : [],
    // The list call has no description. One detail request per job would dominate a cron run.
    description: [job.name, department, ...places].filter(Boolean).join(" · "),
  };
}

export function rippling(slug: string, org: string): Connector {
  return {
    id: `rippling:${slug}`,
    kind: "rippling",
    label: `${org} (Rippling)`,
    fetch: async () => {
      const out: RawOpportunity[] = [];
      for (let page = 0; page < RIPPLING_MAX_PAGES; page++) {
        const data = await fetchJson<{ items?: RipplingJob[]; totalPages?: number }>(
          `https://ats.rippling.com/api/v2/board/${slug}/jobs?page=${page}`,
        );
        out.push(
          ...(data.items ?? []).flatMap((job) => {
            const mapped = mapRippling(org, job);
            return mapped ? [mapped] : [];
          }),
        );
        if (page + 1 >= (data.totalPages ?? 1)) break;
        if ((data.items ?? []).length < RIPPLING_PAGE) break;
      }
      return out;
    },
  };
}
