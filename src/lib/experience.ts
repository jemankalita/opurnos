import type { EligibilityRules, Evidence, Profile } from "./schemas";

// Fresher roles that quietly ask for "2+ years" are the top complaint in Indeed's 2026 fresher
// survey. We read the experience a listing asks for and check it against full-time work on the profile.

type ExperienceRules = Pick<EligibilityRules, "minExperienceYears" | "experiencePreferred">;

const MAX_YEARS = 15;
const FRESHER_RE = /\bfreshers?\b|\bnew grad(uate)?s?\b|\bentry[- ]level\b|\bno (prior )?(work )?experience (is )?(required|needed)\b|\b0\s*(?:-|–|to)\s*\d+\s*(?:years?|yrs?)\b/i;
const NOT_WORK_RE = /^\W*(?:of\s+)?(?:[\w-]+\s+){0,2}?(education|study|studies|schooling|degree|college|university|undergraduate|course|coursework|old|of age)\b/i;
const PREFERRED_RE = /\b(preferred|a plus|nice[- ]to[- ]have|desirable|bonus|advantage|ideally)\b/i;
// A number of years that is about work experience, in the forms listings use.
const YEARS_RES: RegExp[] = [
  /(?:experience|exp\.?)\s*(?:of|:|-|–)?\s*(?:minimum|min\.?|at least)?\s*(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:years?|yrs?)/gi,
  /(?:minimum|min\.?|at least)\s*(?:of\s*)?(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi,
  /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:years?|yrs?)(?:'|’)?s?\s*(?:of\s*)?(?:[\w/-]+\s+){0,4}?(?:experience|exp\b|work)/gi,
];

/** Experience asked for, from listing text. A fresher-friendly listing reads as 0 years. */
export function extractExperience(text: string): ExperienceRules {
  const t = text.slice(0, 12000);
  const asks: { years: number; preferred: boolean }[] = [];
  for (const re of YEARS_RES) {
    for (const m of t.matchAll(re)) {
      const years = Number(m[1]);
      if (!Number.isFinite(years) || years > MAX_YEARS) continue;
      const start = m.index ?? 0;
      // "At least 2 years of university education" and "18 years old" are not work experience.
      if (!/experience|exp\b|work/i.test(m[0]) && NOT_WORK_RE.test(t.slice(start + m[0].length, start + m[0].length + 40))) continue;
      const sentence = t.slice(Math.max(t.lastIndexOf("\n", start) + 1, start - 150), start + m[0].length + 80);
      asks.push({ years, preferred: PREFERRED_RE.test(sentence) });
    }
  }
  if (asks.length === 0) return { minExperienceYears: FRESHER_RE.test(t) ? 0 : null, experiencePreferred: false };
  // The smallest stated bar is the one that decides who may apply.
  const min = Math.min(...asks.map((a) => a.years));
  return { minExperienceYears: min, experiencePreferred: asks.filter((a) => a.years === min).every((a) => a.preferred) };
}

export function isFresherFriendly(text: string): boolean {
  return FRESHER_RE.test(text.slice(0, 12000));
}

const INTERNSHIP_RE = /\b(intern(ship)?|trainee|apprentice|co-?op|student|research assistant|teaching assistant)\b/i;

function monthIndex(value: string | null, now: Date): number | null {
  if (!value) return null;
  if (/present|current|now/i.test(value)) return now.getUTCFullYear() * 12 + now.getUTCMonth();
  const m = value.match(/(\d{4})(?:-(\d{1,2}))?/);
  return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null;
}

/** Years of full-time work on the profile; internships and student roles don't count. */
export function workYears(profile: Profile, now = new Date()): number {
  let months = 0;
  for (const e of profile.experience) {
    if (INTERNSHIP_RE.test(e.title)) continue;
    const start = monthIndex(e.start, now);
    const end = monthIndex(e.end ?? "present", now);
    if (start !== null && end !== null && end > start) months += end - start;
  }
  return Math.round((months / 12) * 10) / 10;
}

export function experienceEvidence(profile: Profile, rules: ExperienceRules, title: string, now = new Date()): Evidence[] {
  const min = rules.minExperienceYears;
  if (min === null || min === undefined) return [];
  if (min === 0) return [{ requirement: "Open to freshers", status: "met", listingQuote: null, profileFact: null }];
  const years = workYears(profile, now);
  const fact = years > 0 ? `${years} years of full-time work` : "No full-time work yet (internships don't count)";
  // "Fresher" in the title with an experience bar in the text is the mismatch students complain about.
  const label = FRESHER_RE.test(title) ? `Says "fresher" but asks for ${min}+ years of experience` : `${min}+ years of experience`;
  if (years >= min) return [{ requirement: label, status: "met", listingQuote: null, profileFact: fact }];
  return [
    {
      requirement: rules.experiencePreferred ? `${label} (preferred, not required)` : label,
      status: rules.experiencePreferred ? "unknown" : "unmet",
      listingQuote: null,
      profileFact: fact,
    },
  ];
}
