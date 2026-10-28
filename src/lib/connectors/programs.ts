import { EMPTY_RULES, type EligibilityRules } from "../schemas";
import { htmlToText, parseDate } from "../text";
import { CURATED_PROGRAMS } from "./curated-programs";
import { fetchJson, fetchText, type Connector, type RawOpportunity } from "./types";

// Seasonal programs: each emits one listing while its application window is open and nothing in between.

// ---------- Google Summer of Code (public program API) ----------

type GsocProgram = {
  slug: string;
  is_active: boolean;
  milestones?: { name: string; datetime: string; label: string }[];
};

/** Rules quoted from developers.google.com/open-source/gsoc/faq (checked 2026-10-28). */
const GSOC_RULES: EligibilityRules = {
  ...structuredClone(EMPTY_RULES),
  minAge: 18,
  other: ["18+ years old at registration", "Student or Open source beginner", "Not residing in a U.S. embargoed country"],
};

export function mapGsoc(p: GsocProgram, now = new Date()): RawOpportunity | null {
  const at = (name: string) => parseDate(p.milestones?.find((m) => m.name === name)?.datetime);
  const deadline = at("proposal_deadline");
  if (!deadline || deadline < now) return null;
  const opens = at("contributor_proposals_open");
  const workStart = at("project_work_start");
  return {
    externalId: p.slug,
    url: "https://summerofcode.withgoogle.com/",
    applyUrl: "https://summerofcode.withgoogle.com/",
    ats: "gsoc",
    type: "fellowship",
    title: `Google Summer of Code ${p.slug}`,
    org: "Google",
    orgLogo: null,
    locations: ["Online"],
    remote: true,
    deadline,
    startsAt: workStart,
    comp: "Paid stipend",
    tags: ["Open source", "Remote", "Mentorship"],
    description: [
      `Google Summer of Code ${p.slug}: contributors write code for an open source organization with a mentor, paid by Google.`,
      opens ? `Contributor proposals open ${opens.toDateString()}.` : "",
      `Proposal deadline ${deadline.toDateString()}.`,
      workStart ? `Project work starts ${workStart.toDateString()}.` : "",
      "Eligibility: 18+ years old at registration. Student or Open source beginner. Not residing in a U.S. embargoed country.",
    ]
      .filter(Boolean)
      .join(" "),
    rules: GSOC_RULES,
  };
}

export const gsoc: Connector = {
  id: "gsoc",
  kind: "gsoc",
  label: "Google Summer of Code",
  fetch: async () => {
    const programs = await fetchJson<GsocProgram[]>("https://summerofcode.withgoogle.com/api/program/");
    return programs.map((p) => mapGsoc(p)).filter((o): o is RawOpportunity => o !== null);
  },
};

// ---------- Outreachy (cohort timeline on the project-selection page) ----------

/** Rules quoted from outreachy.org/docs/applicant (checked 2026-10-28). */
const OUTREACHY_RULES: EligibilityRules = {
  ...structuredClone(EMPTY_RULES),
  minAge: 18,
  other: [
    "Your visa must allow you to work 30 hours per week.",
    "You must not be a past Outreachy intern.",
    "We invite anyone from any background who faces under-representation, systemic bias, or discrimination",
  ],
};

const OUTREACHY_DATE = String.raw`([A-Z][a-z]{2,8})\.? (\d{1,2}), (\d{4})`;

export function parseOutreachy(html: string, now = new Date()): RawOpportunity | null {
  const text = htmlToText(html).replace(/\s+/g, " ");
  const cohort = text.match(/Outreachy ([A-Z][a-z]+ \d{4}) to ([A-Z][a-z]+ \d{4}) Internships/);
  const deadline = text.match(new RegExp(`${OUTREACHY_DATE} at (\\d{1,2})(am|pm) UTC\\s*Initial application deadline`));
  if (!cohort || !deadline) throw new Error("Outreachy timeline not found (layout changed?)");
  const [, mon, day, year, hour, ampm] = deadline;
  const due = parseDate(`${mon} ${day} ${year} ${(Number(hour) % 12) + (ampm === "pm" ? 12 : 0)}:00 UTC`);
  if (!due || due < now) return null;
  return {
    externalId: `outreachy-${cohort[1].replace(" ", "-").toLowerCase()}`,
    url: "https://www.outreachy.org/apply/project-selection/",
    applyUrl: "https://www.outreachy.org/apply/",
    ats: "outreachy",
    type: "internship",
    title: `Outreachy internships, ${cohort[1]} to ${cohort[2]}`,
    org: "Outreachy",
    orgLogo: null,
    locations: ["Online"],
    remote: true,
    deadline: due,
    comp: "$7,000 USD stipend",
    tags: ["Open source", "Remote", "Paid", "Diversity"],
    description: [
      `Outreachy offers paid, remote three-month internships in open source and open science, ${cohort[1]} to ${cohort[2]}.`,
      `Initial application deadline ${due.toUTCString()}.`,
      "Interns are paid a stipend of $7,000 USD for the three month internship. Outreachy interns work 30 hours per week.",
      "You must be 18 years of age or older. Your visa must allow you to work 30 hours per week. You must not be a past Outreachy intern.",
      "We invite anyone from any background who faces under-representation, systemic bias, or discrimination.",
    ].join(" "),
    rules: OUTREACHY_RULES,
  };
}

export const outreachy: Connector = {
  id: "outreachy",
  kind: "outreachy",
  label: "Outreachy internships",
  fetch: async () => {
    const listing = parseOutreachy(await fetchText("https://www.outreachy.org/apply/project-selection/"));
    return listing ? [listing] : [];
  },
};

// ---------- Curated recurring programs (hand-checked against each official page) ----------

export const curated: Connector = {
  id: "curated",
  kind: "curated",
  label: "Curated fellowships & scholarships",
  fetch: async () =>
    CURATED_PROGRAMS.map((p) => {
      const o: RawOpportunity & { checkedOn?: string } = { ...p };
      delete o.checkedOn;
      return o;
    }),
};
