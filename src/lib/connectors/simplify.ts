import { EMPTY_RULES, type EligibilityRules } from "../schemas";
import { parseDate } from "../text";
import { classifyJob, fetchJson, type Connector, type RawOpportunity } from "./types";

// Community-maintained lists on public GitHub (Pitt CSC & Simplify, and vanshb03). Updated daily.
// Many listings appear on both; matching dedupes them by org, title and location.
const LISTS = {
  internships: "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json",
  newgrad: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
  community: "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/.github/scripts/listings.json",
};

const LABELS: Record<keyof typeof LISTS, string> = {
  internships: "SimplifyJobs internships",
  newgrad: "SimplifyJobs new grad",
  community: "Summer 2027 internships (vanshb03)",
};

type SimplifyListing = {
  id: string;
  company_name: string;
  title: string;
  url: string;
  locations?: string[];
  active: boolean;
  is_visible?: boolean;
  date_posted?: number;
  date_updated?: number;
  sponsorship?: string;
  degrees?: string[];
  category?: string;
  terms?: string[];
};

const DEGREE_MAP: Record<string, EligibilityRules["degreeLevels"][number]> = {
  "Bachelor's": "bachelors",
  "Master's": "masters",
  PhD: "phd",
  "High School": "high_school",
};

/** Simplify gives structured eligibility, so these listings skip LLM rule extraction. */
export function simplifyRules(l: SimplifyListing): EligibilityRules {
  const rules: EligibilityRules = structuredClone(EMPTY_RULES);
  rules.degreeLevels = (l.degrees ?? []).map((d) => DEGREE_MAP[d]).filter(Boolean);
  const s = (l.sponsorship ?? "").toLowerCase();
  if (s.includes("does not offer")) rules.sponsorship = "not_offered";
  else if (s.includes("offers sponsorship")) rules.sponsorship = "offered";
  if (s.includes("citizenship")) {
    rules.countries = ["US"];
    rules.other.push(l.sponsorship!);
  }
  return rules;
}

export function mapSimplify(l: SimplifyListing, kind: keyof typeof LISTS): RawOpportunity {
  const locations = l.locations ?? [];
  return {
    externalId: l.id,
    url: l.url,
    applyUrl: l.url,
    ats: /greenhouse/.test(l.url) ? "greenhouse" : /lever\.co/.test(l.url) ? "lever" : /ashbyhq/.test(l.url) ? "ashby" : /myworkdayjobs/.test(l.url) ? "workday" : "other",
    type: kind === "newgrad" ? classifyJob(l.title) : "internship",
    title: l.title.trim(),
    org: l.company_name.trim(),
    locations,
    remote: locations.some((loc) => /remote/i.test(loc)),
    deadline: null,
    postedAt: parseDate(l.date_posted),
    tags: [l.category, ...(l.terms ?? [])].filter((t): t is string => Boolean(t)),
    description: [
      `${l.title} at ${l.company_name}.`,
      l.terms?.length ? `Term: ${l.terms.join(", ")}.` : "",
      l.category ? `Category: ${l.category}.` : "",
      l.degrees?.length ? `Degrees: ${l.degrees.join(", ")}.` : "",
      l.sponsorship ? `Sponsorship: ${l.sponsorship}.` : "",
      `Locations: ${locations.join("; ") || "unspecified"}.`,
    ]
      .filter(Boolean)
      .join(" "),
    rules: simplifyRules(l),
  };
}

const MAX_AGE_DAYS = 120;

export function simplify(kind: keyof typeof LISTS): Connector {
  return {
    id: `simplify:${kind}`,
    kind: "simplify",
    label: LABELS[kind],
    fetch: async () => {
      const data = await fetchJson<SimplifyListing[]>(LISTS[kind], { timeoutMs: 60_000 });
      const cutoff = Date.now() / 1000 - MAX_AGE_DAYS * 86_400;
      return data
        .filter((l) => l.active && l.is_visible !== false && (l.date_updated ?? l.date_posted ?? 0) >= cutoff)
        .map((l) => mapSimplify(l, kind));
    },
  };
}
