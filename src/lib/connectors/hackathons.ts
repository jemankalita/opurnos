import { EMPTY_RULES, type EligibilityRules, type OpportunityType } from "../schemas";
import { decodeEntities, htmlToText, parseDate, truncate } from "../text";
import { fetchJson, type Connector, type RawOpportunity } from "./types";

// ---------- Devpost (public listing JSON used by devpost.com/hackathons) ----------

type DevpostHackathon = {
  id: number;
  title: string;
  url: string;
  thumbnail_url?: string;
  organization_name?: string;
  displayed_location?: { location?: string };
  submission_period_dates?: string;
  themes?: { name: string }[];
  prize_amount?: string;
  registrations_count?: number;
  invite_only?: boolean;
  open_state?: string;
};

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "Aug 26 - Oct 30, 2026" | "Oct 30 - Nov 02, 2026" | "Dec 28, 2026 - Jan 05, 2027" → end date. */
export function parseDevpostEnd(range: string | undefined): Date | null {
  if (!range) return null;
  const end = range.split(/\s+-\s+/).pop() ?? "";
  const m = end.match(/([A-Za-z]{3})\w*\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!m) return null;
  const year = Number(m[3] ?? range.match(/(\d{4})/)?.[1] ?? new Date().getUTCFullYear());
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(year, month, Number(m[2]), 23, 59));
}

export function mapDevpost(h: DevpostHackathon): RawOpportunity {
  const location = h.displayed_location?.location ?? "";
  const prize = h.prize_amount ? decodeEntities(h.prize_amount.replace(/<[^>]+>/g, "")) : null;
  const themes = (h.themes ?? []).map((t) => t.name);
  return {
    externalId: String(h.id),
    url: h.url,
    applyUrl: h.url,
    ats: "devpost",
    type: "hackathon",
    title: h.title.trim(),
    org: h.organization_name || "Devpost",
    orgLogo: h.thumbnail_url ? (h.thumbnail_url.startsWith("//") ? `https:${h.thumbnail_url}` : h.thumbnail_url) : null,
    locations: location ? [location] : [],
    remote: /online/i.test(location),
    deadline: parseDevpostEnd(h.submission_period_dates),
    comp: prize && prize !== "$0" ? `${prize} in prizes` : null,
    tags: themes,
    description: [
      `${h.title} — hackathon on Devpost${location ? ` (${location})` : ""}.`,
      h.submission_period_dates ? `Submission period: ${h.submission_period_dates}.` : "",
      themes.length ? `Themes: ${themes.join(", ")}.` : "",
      prize ? `Prizes: ${prize}.` : "",
      h.registrations_count ? `${h.registrations_count.toLocaleString("en-US")} registered.` : "",
      h.invite_only ? "Invite only." : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export const devpost: Connector = {
  id: "devpost",
  kind: "devpost",
  label: "Devpost hackathons",
  fetch: async () => {
    const out: RawOpportunity[] = [];
    for (let page = 1; page <= 25; page++) {
      const data = await fetchJson<{ hackathons: DevpostHackathon[] }>(
        `https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=${page}`,
      );
      if (!data.hackathons?.length) break;
      out.push(...data.hackathons.filter((h) => !h.invite_only).map(mapDevpost));
      await new Promise((r) => setTimeout(r, 400)); // be polite
    }
    return out;
  },
};

// ---------- Hack Club hackathon directory ----------

type HackClubEvent = {
  id: string;
  name: string;
  website: string;
  start: string;
  end: string;
  logo?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  virtual?: boolean;
  hybrid?: boolean;
  mlhAssociated?: boolean;
};

export function mapHackClub(e: HackClubEvent): RawOpportunity {
  const where = e.virtual ? "Online" : [e.city, e.state, e.country].filter(Boolean).join(", ");
  const start = parseDate(e.start);
  const rules: EligibilityRules = { ...structuredClone(EMPTY_RULES), studentsOnly: true, degreeLevels: ["high_school"] };
  return {
    externalId: e.id,
    url: e.website,
    applyUrl: e.website,
    ats: "other",
    type: "hackathon",
    title: e.name.trim(),
    org: e.name.trim(),
    orgLogo: e.logo ?? null,
    locations: where ? [where] : [],
    remote: Boolean(e.virtual || e.hybrid),
    // Registration closes when the event starts at the latest.
    deadline: start,
    startsAt: start,
    tags: [e.mlhAssociated ? "MLH" : "", e.hybrid ? "Hybrid" : "", "High school"].filter(Boolean),
    description: `${e.name} is a high-school hackathon listed on Hack Club${where ? ` in ${where}` : ""}, ${start?.toDateString() ?? "date TBA"}.${e.mlhAssociated ? " MLH member event." : ""}`,
    rules,
  };
}

export const hackclub: Connector = {
  id: "hackclub",
  kind: "hackclub",
  label: "Hack Club hackathons",
  fetch: async () => {
    const data = await fetchJson<HackClubEvent[]>("https://hackathons.hackclub.com/api/events/upcoming");
    return data.map(mapHackClub);
  },
};

// ---------- Unstop (India): hackathons, internships, scholarships, competitions ----------

type UnstopItem = {
  id: number;
  title: string;
  type: string;
  seo_url: string;
  details?: string;
  region?: string;
  logoUrl2?: string;
  organisation?: { name?: string };
  end_date?: string;
  regnRequirements?: { end_regn_dt?: string; eligibility?: string; min_team_size?: number; max_team_size?: number };
  prizes?: { cash?: number; currencyCode?: string }[];
  required_skills?: { skill_name?: string; skill?: string }[];
  locations?: { city?: string; state?: string }[];
  address_with_country_logo?: { city?: string; country?: { iso?: string; name?: string } };
};

const UNSTOP_TYPE: Record<string, OpportunityType> = {
  hackathons: "hackathon",
  internships: "internship",
  scholarships: "scholarship",
  competitions: "competition",
};

export function mapUnstop(item: UnstopItem, kind: string): RawOpportunity {
  const totalCash = (item.prizes ?? []).reduce((s, p) => s + (p.cash ?? 0), 0);
  const currency = item.prizes?.find((p) => p.currencyCode)?.currencyCode ?? "INR";
  const eligibility = item.regnRequirements?.eligibility ?? "";
  const rules: EligibilityRules = structuredClone(EMPTY_RULES);
  rules.studentsOnly = /"sector":\[[^\]]*"students"/.test(eligibility) && !/"professionals"/.test(eligibility);
  const countryIso = item.address_with_country_logo?.country?.iso;
  const online = item.region === "online";
  if (countryIso && !online) rules.countries = [countryIso.toUpperCase()];
  const { min_team_size: min, max_team_size: max } = item.regnRequirements ?? {};
  if (min && max) rules.teamSize = `${min}-${max}`;
  const city = item.address_with_country_logo?.city;
  return {
    externalId: String(item.id),
    url: item.seo_url,
    applyUrl: item.seo_url,
    ats: "unstop",
    type: UNSTOP_TYPE[kind] ?? "competition",
    title: item.title.trim(),
    org: item.organisation?.name ?? "Unstop",
    orgLogo: item.logoUrl2 ?? null,
    locations: online ? ["Online"] : [city, item.address_with_country_logo?.country?.name].filter((x): x is string => Boolean(x)),
    remote: online,
    deadline: parseDate(item.regnRequirements?.end_regn_dt ?? item.end_date),
    comp: totalCash > 0 ? `${currency} ${totalCash.toLocaleString("en-IN")} in prizes` : null,
    tags: (item.required_skills ?? []).map((s) => s.skill_name ?? s.skill ?? "").filter(Boolean).slice(0, 8),
    description: truncate(htmlToText(item.details), 6000),
    rules,
  };
}

export function unstop(kind: keyof typeof UNSTOP_TYPE): Connector {
  return {
    id: `unstop:${kind}`,
    kind: "unstop",
    label: `Unstop ${kind}`,
    fetch: async () => {
      const out: RawOpportunity[] = [];
      for (let page = 1; page <= 4; page++) {
        const data = await fetchJson<{ data: { data: UnstopItem[]; last_page: number } }>(
          `https://unstop.com/api/public/opportunity/search-result?opportunity=${kind}&oppstatus=open&per_page=30&page=${page}`,
        );
        out.push(...data.data.data.map((i) => mapUnstop(i, kind)));
        if (page >= data.data.last_page) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      return out;
    },
  };
}
