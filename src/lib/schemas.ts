import { z } from "zod";

export const OPPORTUNITY_TYPES = [
  "job",
  "internship",
  "hackathon",
  "fellowship",
  "scholarship",
  "research",
  "conference",
  "grant",
  "competition",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const VERDICTS = ["eligible", "likely", "stretch", "ineligible"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const MATCH_STATUSES = [
  "new",
  "saved",
  "dismissed",
  "applying",
  "submitted",
  "interview",
  "rejected",
  "offer",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const DEGREE_LEVELS = ["high_school", "bachelors", "masters", "phd", "other"] as const;

// ---------- Profile (parsed from a resume, edited by the user) ----------

export const ExperienceSchema = z.object({
  title: z.string(),
  org: z.string(),
  start: z.string().nullable().describe("YYYY-MM or null"),
  end: z.string().nullable().describe("YYYY-MM, 'present' or null"),
  bullets: z.array(z.string()).describe("Verbatim or lightly cleaned bullet points from the resume"),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  url: z.string().nullable(),
});

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string().describe("e.g. B.Tech Computer Science"),
  level: z.enum(DEGREE_LEVELS),
  field: z.string().nullable(),
  gradYear: z.number().int().nullable(),
  gpa: z.string().nullable(),
});

export const ProfileSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable().describe("City, Country"),
  country: z.string().nullable().describe("ISO 3166-1 alpha-2 code, e.g. IN, US"),
  links: z.array(z.string()).describe("GitHub, LinkedIn, portfolio URLs"),
  headline: z.string().describe("One-line professional summary"),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(z.string()),
  achievements: z.array(z.string()).describe("Awards, hackathon wins, publications"),
  interests: z.array(z.string()).describe("Domains the person seems drawn to, e.g. 'robotics', 'quant'"),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PreferencesSchema = z.object({
  types: z.array(z.enum(OPPORTUNITY_TYPES)).min(1),
  roles: z.array(z.string()).describe("Role keywords, e.g. 'software engineer', 'ml research'"),
  locations: z.array(z.string()),
  remoteOk: z.boolean(),
  workAuth: z.array(z.string()).describe("Countries the user can work in without sponsorship (ISO codes)"),
  needsSponsorship: z.boolean(),
  digest: z.enum(["daily", "weekly", "off"]),
  timezone: z.string(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  types: ["internship", "hackathon", "fellowship", "scholarship", "research"],
  roles: [],
  locations: [],
  remoteOk: true,
  workAuth: [],
  needsSponsorship: false,
  digest: "daily",
  timezone: "UTC",
};

// ---------- Opportunity eligibility rules (extracted from listings) ----------

export const EligibilityRulesSchema = z.object({
  degreeLevels: z.array(z.enum(DEGREE_LEVELS)).describe("Allowed levels; empty = no restriction"),
  gradYearMin: z.number().int().nullable(),
  gradYearMax: z.number().int().nullable(),
  countries: z.array(z.string()).describe("ISO codes the applicant must reside in / be a citizen of; empty = any"),
  sponsorship: z.enum(["offered", "not_offered", "unknown"]),
  studentsOnly: z.boolean(),
  minAge: z.number().int().nullable(),
  maxAge: z.number().int().nullable(),
  requiredSkills: z.array(z.string()),
  teamSize: z.string().nullable(),
  other: z.array(z.string()).describe("Any other stated requirement, verbatim"),
});
export type EligibilityRules = z.infer<typeof EligibilityRulesSchema>;

export const EMPTY_RULES: EligibilityRules = {
  degreeLevels: [],
  gradYearMin: null,
  gradYearMax: null,
  countries: [],
  sponsorship: "unknown",
  studentsOnly: false,
  minAge: null,
  maxAge: null,
  requiredSkills: [],
  teamSize: null,
  other: [],
};

// ---------- Eligibility judgement (per user × opportunity) ----------

export const EvidenceSchema = z.object({
  requirement: z.string().describe("The requirement being checked, short"),
  status: z.enum(["met", "unmet", "unknown"]),
  listingQuote: z.string().nullable().describe("Verbatim text from the listing that states the requirement"),
  profileFact: z.string().nullable().describe("The profile fact used, quoted from the profile"),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const JudgementSchema = z.object({
  verdict: z.enum(VERDICTS),
  fit: z.number().min(0).max(1).describe("How well the person's background fits, 0..1"),
  value: z.number().min(0).max(1).describe("How valuable/prestigious the opportunity is, 0..1"),
  why: z.string().describe("One sentence, second person, why this is (or isn't) a match"),
  evidence: z.array(EvidenceSchema),
  gaps: z.array(z.string()).describe("Concrete missing qualifications, if any"),
});
export type Judgement = z.infer<typeof JudgementSchema>;

// ---------- Apply flow ----------

export const TailoredSchema = z.object({
  summary: z.string().describe("2-3 sentence tailored summary"),
  bullets: z
    .array(z.object({ section: z.string(), text: z.string() }))
    .describe("Resume bullets reordered/reworded for this opportunity"),
  coverLetter: z.string(),
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Answers to common application questions"),
});
export type Tailored = z.infer<typeof TailoredSchema>;

export const ClaimCheckSchema = z.object({
  claim: z.string().describe("An atomic factual claim from the tailored material"),
  status: z.enum(["supported", "rephrased", "unsupported"]),
  source: z.string().nullable().describe("The resume text that supports it, verbatim"),
  note: z.string().nullable(),
});
export const VerifierReportSchema = z.object({
  claims: z.array(ClaimCheckSchema),
});
export type ClaimCheck = z.infer<typeof ClaimCheckSchema>;
export type VerifierReport = z.infer<typeof VerifierReportSchema>;

export const APPLICATION_STATES = [
  "drafting",
  "review_materials",
  "queued",
  "filling",
  "awaiting_approval",
  "submitting",
  "submitted",
  "handoff",
  "failed",
  "cancelled",
] as const;
export type ApplicationState = (typeof APPLICATION_STATES)[number];
