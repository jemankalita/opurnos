import { academicEvidence } from "./academics";
import { experienceEvidence } from "./experience";
import { EMPTY_RULES, type EligibilityRules, type Evidence, type Preferences, type Profile, type Verdict } from "./schemas";

export type RuleCheck = {
  /** Worst outcome across hard rules: ineligible > unknown > eligible. */
  verdict: Extract<Verdict, "eligible" | "likely" | "ineligible">;
  evidence: Evidence[];
};

const LEVEL_LABEL: Record<string, string> = {
  high_school: "High school",
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
  other: "Other",
};

function latestEducation(profile: Profile) {
  return [...profile.education].sort((a, b) => (b.gradYear ?? 0) - (a.gradYear ?? 0))[0];
}

export function isStudent(profile: Profile, now = new Date()): boolean | null {
  const edu = latestEducation(profile);
  if (!edu?.gradYear) return null;
  return edu.gradYear >= now.getUTCFullYear();
}

/**
 * Deterministic hard-rule check. It never upgrades a model verdict, it only provides
 * evidence and catches clear disqualifiers (used before and after the LLM judge).
 */
export function checkRules(
  profile: Profile,
  prefs: Preferences,
  storedRules: EligibilityRules,
  deadline: Date | null,
  now = new Date(),
  title = "",
): RuleCheck {
  // Rules stored before a field existed (e.g. the academic cutoffs) read as "no restriction".
  const rules: EligibilityRules = { ...EMPTY_RULES, ...storedRules };
  const evidence: Evidence[] = [];
  const edu = latestEducation(profile);

  if (deadline) {
    const open = deadline.getTime() >= now.getTime();
    evidence.push({
      requirement: "Applications open",
      status: open ? "met" : "unmet",
      listingQuote: `Deadline ${deadline.toISOString().slice(0, 10)}`,
      profileFact: null,
    });
  }

  if (rules.degreeLevels.length > 0) {
    const allowed = rules.degreeLevels.map((l) => LEVEL_LABEL[l]).join(" / ");
    const levels = profile.education.map((e) => e.level);
    evidence.push({
      requirement: `Degree: ${allowed}`,
      status: levels.length === 0 ? "unknown" : levels.some((l) => rules.degreeLevels.includes(l)) ? "met" : "unmet",
      listingQuote: null,
      profileFact: edu ? `${edu.degree}, ${edu.school}` : null,
    });
  }

  if (rules.gradYearMin !== null || rules.gradYearMax !== null) {
    const gy = edu?.gradYear ?? null;
    const okMin = rules.gradYearMin === null || (gy !== null && gy >= rules.gradYearMin);
    const okMax = rules.gradYearMax === null || (gy !== null && gy <= rules.gradYearMax);
    evidence.push({
      requirement: `Graduation ${rules.gradYearMin ?? "…"}–${rules.gradYearMax ?? "…"}`,
      status: gy === null ? "unknown" : okMin && okMax ? "met" : "unmet",
      listingQuote: null,
      profileFact: gy !== null ? `Graduating ${gy}` : null,
    });
  }

  if (rules.countries.length > 0) {
    const userCountries = new Set([...(profile.country ? [profile.country] : []), ...prefs.workAuth].map((c) => c.toUpperCase()));
    const allowed = rules.countries.map((c) => c.toUpperCase());
    evidence.push({
      requirement: `Location / authorization: ${allowed.join(", ")}`,
      status: userCountries.size === 0 ? "unknown" : allowed.some((c) => userCountries.has(c)) ? "met" : "unmet",
      listingQuote: null,
      profileFact: userCountries.size ? `Based in / authorized for ${[...userCountries].join(", ")}` : null,
    });
  }

  if (rules.sponsorship === "not_offered" && prefs.needsSponsorship) {
    evidence.push({
      requirement: "No visa sponsorship",
      status: "unmet",
      listingQuote: null,
      profileFact: "You told us you need sponsorship",
    });
  }

  if (rules.studentsOnly) {
    const student = isStudent(profile, now);
    evidence.push({
      requirement: "Current students only",
      status: student === null ? "unknown" : student ? "met" : "unmet",
      listingQuote: null,
      profileFact: edu?.gradYear ? `Graduating ${edu.gradYear}` : null,
    });
  }

  evidence.push(...academicEvidence(profile, rules));
  evidence.push(...experienceEvidence(profile, rules, title, now));

  const verdict = evidence.some((e) => e.status === "unmet")
    ? "ineligible"
    : evidence.some((e) => e.status === "unknown")
      ? "likely"
      : "eligible";
  return { verdict, evidence };
}

/** Merge model evidence with hard-rule evidence; hard "unmet" always wins. */
export function reconcileVerdict(modelVerdict: Verdict, rules: RuleCheck): Verdict {
  if (rules.verdict === "ineligible") return "ineligible";
  return modelVerdict;
}
