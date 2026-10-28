import { EMPTY_RULES, type EligibilityRules, type OpportunityType } from "../schemas";
import { decodeEntities, htmlToText, parseDate, truncate } from "../text";
import { classifyJob, fetchJson, fetchText, type Connector, type RawOpportunity } from "./types";

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

// ---------- Unstop (India): hackathons, internships, jobs, scholarships, competitions ----------

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
  locations?: { city?: string; state?: string; country?: string }[];
  address_with_country_logo?: { city?: string; country?: { iso?: string; name?: string } };
  // Jobs and internships: pay (stipend for internships) and work mode.
  jobDetail?: { min_salary?: number | null; max_salary?: number | null; currency?: string; show_salary?: number; not_disclosed?: boolean; pay_in?: string; type?: string };
};

const UNSTOP_TYPE: Record<string, OpportunityType> = {
  hackathons: "hackathon",
  internships: "internship",
  jobs: "job",
  scholarships: "scholarship",
  competitions: "competition",
};

function unstopPay(d: UnstopItem["jobDetail"]): string | null {
  if (!d?.show_salary || d.not_disclosed || !d.max_salary || d.currency !== "fa-rupee") return null;
  const range = [...new Set([d.min_salary, d.max_salary])].filter((n): n is number => Boolean(n)).map((n) => n.toLocaleString("en-IN")).join("–");
  return `₹${range}${d.pay_in === "monthly" ? "/month" : d.pay_in === "yearly" ? "/year" : ""}`;
}

export function mapUnstop(item: UnstopItem, kind: string): RawOpportunity {
  const totalCash = (item.prizes ?? []).reduce((s, p) => s + (p.cash ?? 0), 0);
  const currency = item.prizes?.find((p) => p.currencyCode)?.currencyCode ?? "INR";
  const eligibility = item.regnRequirements?.eligibility ?? "";
  const rules: EligibilityRules = structuredClone(EMPTY_RULES);
  rules.studentsOnly = /"sector":\[[^\]]*"students"/.test(eligibility) && !/"professionals"/.test(eligibility);
  const countryIso = item.address_with_country_logo?.country?.iso;
  // Jobs are all region "online" (you apply online); their work mode is jobDetail.type.
  const online = item.jobDetail?.type ? /wfh|remote|home/i.test(item.jobDetail.type) : item.region === "online";
  if (countryIso && !online) rules.countries = [countryIso.toUpperCase()];
  const { min_team_size: min, max_team_size: max } = item.regnRequirements ?? {};
  if (min && max) rules.teamSize = `${min}-${max}`;
  const city = item.address_with_country_logo?.city;
  const places = [city, item.address_with_country_logo?.country?.name].filter((x): x is string => Boolean(x));
  // Jobs carry their cities in `locations` instead.
  const jobPlaces = (item.locations ?? []).map((l) => [l.city, l.state, l.country].filter(Boolean).join(", ")).filter(Boolean);
  return {
    externalId: String(item.id),
    url: item.seo_url,
    applyUrl: item.seo_url,
    ats: "unstop",
    // Unstop's job list mixes in fellowships and trainee roles, so jobs are typed by title.
    type: kind === "jobs" ? classifyJob(item.title) : (UNSTOP_TYPE[kind] ?? "competition"),
    title: item.title.trim(),
    org: item.organisation?.name ?? "Unstop",
    orgLogo: item.logoUrl2 ?? null,
    locations: item.jobDetail ? [online ? "Remote" : "", ...jobPlaces].filter(Boolean).slice(0, 5) : online ? ["Online"] : places,
    remote: online,
    deadline: parseDate(item.regnRequirements?.end_regn_dt ?? item.end_date),
    comp: totalCash > 0 ? `${currency} ${totalCash.toLocaleString("en-IN")} in prizes` : unstopPay(item.jobDetail),
    tags: (item.required_skills ?? []).map((s) => s.skill_name ?? s.skill ?? "").filter(Boolean).slice(0, 8),
    description: truncate(htmlToText(item.details), 6000),
    rules,
  };
}

export function unstop(kind: keyof typeof UNSTOP_TYPE, maxPages = 4): Connector {
  return {
    id: `unstop:${kind}`,
    kind: "unstop",
    label: `Unstop ${kind}`,
    fetch: async () => {
      const out: RawOpportunity[] = [];
      for (let page = 1; page <= maxPages; page++) {
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

// ---------- MLH (season page embeds its event list as Inertia page JSON) ----------

type MlhEvent = {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  formatType?: string; // physical | hybrid_physical | digital | ...
  logoUrl?: string;
  websiteUrl?: string;
  region?: string;
};

/** MLH seasons run Aug → Jul and are named after the year they end in. */
export function mlhSeason(now = new Date()): number {
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

export function parseMlhEvents(html: string): MlhEvent[] {
  const m = html.match(/<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("MLH page data not found (layout changed?)");
  const page = JSON.parse(m[1]) as { props?: { upcomingEvents?: MlhEvent[] } };
  return page.props?.upcomingEvents ?? [];
}

export function mapMlh(e: MlhEvent): RawOpportunity {
  const online = e.formatType === "digital";
  const hybrid = Boolean(e.formatType?.startsWith("hybrid"));
  const where = online ? "Online" : (e.location ?? "").trim();
  const start = parseDate(e.startsAt);
  const end = parseDate(e.endsAt);
  const link = e.websiteUrl || `https://www.mlh.com/events/${e.slug}`;
  return {
    externalId: e.id,
    url: link,
    applyUrl: link,
    ats: "mlh",
    type: "hackathon",
    title: e.name.trim(),
    org: e.name.trim(),
    orgLogo: e.logoUrl ?? null,
    locations: where ? [where] : [],
    remote: online || hybrid,
    // Registration closes when the event starts at the latest.
    deadline: start,
    startsAt: start,
    tags: ["MLH", hybrid ? "Hybrid" : "", e.region ?? ""].filter(Boolean),
    description: `${e.name} is an MLH member hackathon${where ? ` in ${where}` : ""}, ${start?.toDateString() ?? "date TBA"}${
      end ? ` to ${end.toDateString()}` : ""
    }.`,
  };
}

export const mlh: Connector = {
  id: "mlh",
  kind: "mlh",
  label: "MLH hackathons",
  fetch: async () => {
    const html = await fetchText(`https://www.mlh.com/seasons/${mlhSeason()}/events`);
    return parseMlhEvents(html).map(mapMlh);
  },
};

// ---------- Devfolio (public search API behind devfolio.co/hackathons) ----------

type DevfolioHackathon = {
  uuid: string;
  slug: string;
  name: string;
  tagline?: string | null;
  desc?: string | null;
  starts_at?: string;
  is_online?: boolean;
  city?: string | null;
  country?: string | null;
  cover_img?: string | null;
  team_min?: number | null;
  team_size?: number | null;
  participants_count?: number | null;
  themes?: { name: string }[];
  hackathon_setting?: { reg_ends_at?: string | null; women_only?: boolean; logo?: string | null; external_apply_url?: string | null } | null;
};

export function mapDevfolio(h: DevfolioHackathon): RawOpportunity {
  const s = h.hackathon_setting ?? {};
  const where = h.is_online ? "Online" : [h.city, h.country].filter(Boolean).join(", ");
  const rules: EligibilityRules = structuredClone(EMPTY_RULES);
  if (h.team_min && h.team_size) rules.teamSize = `${h.team_min}-${h.team_size}`;
  if (s.women_only) rules.other = ["Women only"];
  const page = `https://${h.slug}.devfolio.co/`;
  return {
    externalId: h.uuid,
    url: page,
    applyUrl: s.external_apply_url || page,
    ats: "devfolio",
    type: "hackathon",
    title: h.name.trim(),
    org: h.name.trim(),
    orgLogo: s.logo ?? h.cover_img ?? null,
    locations: where ? [where] : [],
    remote: Boolean(h.is_online),
    deadline: parseDate(s.reg_ends_at ?? h.starts_at),
    startsAt: parseDate(h.starts_at),
    tags: [...(h.themes ?? []).map((t) => t.name), s.women_only ? "Women only" : ""].filter(Boolean),
    description: truncate(
      [
        h.tagline?.trim() ?? "",
        `${h.name} is a hackathon on Devfolio${where ? ` (${where})` : ""}.`,
        rules.teamSize ? `Teams of ${rules.teamSize}.` : "",
        s.women_only ? "Women only." : "",
        h.participants_count ? `${h.participants_count.toLocaleString("en-US")} registered.` : "",
        h.desc ?? "",
      ]
        .filter(Boolean)
        .join(" "),
      6000,
    ),
    rules,
  };
}

export const devfolio: Connector = {
  id: "devfolio",
  kind: "devfolio",
  label: "Devfolio hackathons",
  fetch: async () => {
    const seen = new Map<string, RawOpportunity>();
    for (const type of ["application_open", "upcoming"]) {
      const data = await fetchJson<{ hits: { hits: { _source: DevfolioHackathon }[] } }>("https://api.devfolio.co/api/search/hackathons", {
        body: { type, from: 0, size: 100 },
      });
      for (const { _source: h } of data.hits.hits) if (!seen.has(h.uuid)) seen.set(h.uuid, mapDevfolio(h));
    }
    return [...seen.values()];
  },
};

// ---------- ETHGlobal (upcoming cards on ethglobal.com/events; past events are a separate list) ----------

const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Cards show "November 5–7" with no year: take the next occurrence on or after today. */
export function nextOccurrence(month: string, day: number, now = new Date()): Date | null {
  const m = MONTH_INDEX[month.slice(0, 3).toLowerCase()];
  if (m === undefined || !day) return null;
  const thisYear = new Date(Date.UTC(now.getUTCFullYear(), m, day));
  const yesterday = new Date(now.getTime() - 86_400_000);
  return thisYear >= yesterday ? thisYear : new Date(Date.UTC(now.getUTCFullYear() + 1, m, day));
}

export function parseEthGlobal(html: string, now = new Date()): RawOpportunity[] {
  const start = html.indexOf("Upcoming<!-- -->");
  if (start < 0) throw new Error("ETHGlobal upcoming section not found (layout changed?)");
  const end = html.indexOf("Past<!-- -->", start);
  const section = html.slice(start, end < 0 ? undefined : end);
  const out: RawOpportunity[] = [];
  for (const [, href, card] of section.matchAll(/<a[^>]*href="([^"]+)"[^>]*><section[^>]*>([\s\S]*?)<\/section><\/a>/g)) {
    const name = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.trim();
    if (!name) continue;
    const texts = [...card.matchAll(/>([^<>]+)</g)].map((m) => decodeEntities(m[1]).trim()).filter((t) => t && t !== ",");
    const month = texts.find((t) => MONTH_INDEX[t.slice(0, 3).toLowerCase()] !== undefined) ?? "";
    const day = Number(texts.find((t) => /^\d{1,2}$/.test(t)));
    const kind = texts.find((t) => /hackathon|conference|summit|co-working/i.test(t)) ?? "";
    const nameAt = texts.indexOf(name);
    const where = texts.slice(nameAt + 1, texts.indexOf(kind)).join(", ");
    const startsAt = nextOccurrence(month, day, now);
    const slug = href.match(/^\/events\/([a-z0-9-]+)/)?.[1];
    const url = slug ? `https://ethglobal.com/events/${slug}` : href;
    out.push({
      externalId: slug ?? href,
      url,
      applyUrl: url,
      ats: "ethglobal",
      type: /hackathon/i.test(kind) ? "hackathon" : "conference",
      title: name,
      org: "ETHGlobal",
      orgLogo: slug ? `https://cdn.ethglobal.com/events/${slug}/square-logo/default.png` : null,
      locations: where ? [where] : [],
      remote: /online/i.test(kind),
      // Attendance is by application; it closes when the event starts at the latest.
      deadline: startsAt,
      startsAt,
      tags: ["Ethereum", "Web3", kind].filter(Boolean),
      description: `${name}: ${kind || "event"} by ETHGlobal${where ? ` in ${where}` : ""}${startsAt ? `, starting ${startsAt.toDateString()}` : ""}. Apply to attend.`,
    });
  }
  return out;
}

export const ethglobal: Connector = {
  id: "ethglobal",
  kind: "ethglobal",
  label: "ETHGlobal events",
  fetch: async () => parseEthGlobal(await fetchText("https://ethglobal.com/events")),
};

// ---------- HackerEarth (the JSON feed behind its browser extension) ----------

type HackerEarthEvent = {
  title: string;
  description?: string;
  url: string;
  status?: string;
  college?: boolean;
  start_utc_tz?: string;
  end_utc_tz?: string;
  thumbnail?: string;
  challenge_type?: string;
};

export function mapHackerEarth(e: HackerEarthEvent): RawOpportunity {
  const startsAt = parseDate(e.start_utc_tz?.replace(" ", "T"));
  const endsAt = parseDate(e.end_utc_tz?.replace(" ", "T"));
  const hackathon = /hackathon/i.test(`${e.title} ${e.url}`);
  return {
    externalId: e.url,
    url: e.url,
    applyUrl: e.url,
    ats: "hackerearth",
    type: hackathon ? "hackathon" : "competition",
    title: decodeEntities(e.title).trim(),
    org: "HackerEarth",
    orgLogo: e.thumbnail ?? null,
    locations: ["Online"],
    remote: true,
    // Registration stays open while the challenge runs.
    deadline: endsAt,
    startsAt,
    tags: [e.challenge_type ?? "", e.college ? "College" : ""].filter(Boolean),
    description: [
      decodeEntities(e.description ?? ""),
      startsAt ? `Starts ${startsAt.toUTCString()}.` : "",
      endsAt ? `Ends ${endsAt.toUTCString()}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export const hackerearth: Connector = {
  id: "hackerearth",
  kind: "hackerearth",
  label: "HackerEarth challenges",
  fetch: async () => {
    const data = await fetchJson<{ response: HackerEarthEvent[] }>("https://www.hackerearth.com/chrome-extension/events/");
    return data.response.filter((e) => e.status !== "ENDED").map(mapHackerEarth);
  },
};
