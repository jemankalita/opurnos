import type { EligibilityRules, Evidence, Profile } from "./schemas";

// Academic cutoffs as Indian hiring drives and scholarships state them: batch, CGPA or
// percentage ("60% throughout" = Class 10, 12 and the degree), active backlogs and branch.

type Education = Profile["education"][number];
export type Marks = { cgpa?: number; percent?: number };

/** "8.2/10", "8.2 CGPA", "CPI 8.2", "85%", "85.4 %". 4-point GPAs are left alone. */
export function parseMarks(raw: string | null | undefined): Marks {
  if (!raw) return {};
  const pct = raw.match(/(\d{2,3}(?:\.\d+)?)\s*%/);
  if (pct && Number(pct[1]) <= 100) return { percent: Number(pct[1]) };
  const outOf = raw.match(/(\d{1,2}(?:\.\d+)?)\s*\/\s*(\d{1,3})/);
  if (outOf) {
    const [score, scale] = [Number(outOf[1]), Number(outOf[2])];
    if (scale === 10 && score <= 10) return { cgpa: score };
    if (scale === 100 && score <= 100) return { percent: score };
    return {};
  }
  const bare = raw.match(/(\d{1,2}(?:\.\d+)?)/);
  if (bare && /cgpa|cpi|sgpa|gpa/i.test(raw) && Number(bare[1]) > 4 && Number(bare[1]) <= 10) return { cgpa: Number(bare[1]) };
  return {};
}

// CGPA ↔ percentage has no single rule: CBSE multiplies by 9.5, AICTE uses (CGPA − 0.75) × 10.
// A cross-scale comparison only counts when both conversions agree.
const toPercent = (cgpa: number) => [(cgpa - 0.75) * 10, cgpa * 9.5];
const toCgpa = (percent: number) => [percent / 9.5, percent / 10 + 0.75];

type Outcome = "met" | "unmet" | "unknown";

export function meetsCutoff(marks: Marks, rules: Pick<EligibilityRules, "minCgpa" | "minPercent">): Outcome {
  const { minCgpa, minPercent } = rules;
  // Same scale first; "60% or 6.0 CGPA" accepts either.
  const direct: Outcome[] = [];
  if (minCgpa !== null && marks.cgpa !== undefined) direct.push(marks.cgpa >= minCgpa ? "met" : "unmet");
  if (minPercent !== null && marks.percent !== undefined) direct.push(marks.percent >= minPercent ? "met" : "unmet");
  if (direct.includes("met")) return "met";
  if (direct.length) return "unmet";
  const passes =
    minPercent !== null && marks.cgpa !== undefined
      ? toPercent(marks.cgpa).map((p) => p >= minPercent)
      : minCgpa !== null && marks.percent !== undefined
        ? toCgpa(marks.percent).map((c) => c >= minCgpa)
        : null;
  if (!passes) return "unknown";
  return passes.every(Boolean) ? "met" : passes.some(Boolean) ? "unknown" : "unmet";
}

// ---------- Branches ----------

const BRANCH_ALIASES: Array<[string, RegExp]> = [
  ["CSE", /\b(cse|cs|computer science|computer engineering|cs ?& ?e|software engineering)\b/i],
  ["IT", /\b(IT|information technology|information science|ISE)\b/],
  ["AI/DS", /\b(ai ?& ?ds|ai ?& ?ml|aiml|artificial intelligence|data science)\b/i],
  ["ECE", /\b(ece|e ?& ?c|electronics (and|&) (communication|telecommunication)|entc)\b/i],
  ["EEE", /\b(eee|electrical (and|&) electronics)\b/i],
  ["EE", /\b(ee|electrical engineering|electrical)\b/i],
  ["ME", /\b(mech|mechanical)\b/i],
  ["CE", /\bcivil\b/i],
  ["CHE", /\bchemical\b/i],
  ["MCA", /\bmca\b/i],
];
const CIRCUIT = ["CSE", "IT", "AI/DS", "ECE", "EEE", "EE"];

/** Canonical branch codes named in some text ("B.Tech CSE", "Electronics and Communication"). */
export function branchCodes(text: string): string[] {
  const codes = BRANCH_ALIASES.filter(([, re]) => re.test(text)).map(([code]) => code);
  if (/circuit branch/i.test(text)) codes.push(...CIRCUIT);
  // "Electrical and Electronics" also reads as Electrical; keep the specific one.
  return [...new Set(codes.includes("EEE") ? codes.filter((c) => c !== "EE") : codes)];
}

// ---------- Profile side ----------

const isSchool = (e: Education) => e.level === "high_school";

function degreeEntry(profile: Profile): Education | undefined {
  return [...profile.education].filter((e) => !isSchool(e)).sort((a, b) => (b.gradYear ?? 0) - (a.gradYear ?? 0))[0];
}

function marksEvidence(profile: Profile, rules: EligibilityRules): Evidence {
  const cutoff = [rules.minPercent !== null ? `${rules.minPercent}%` : "", rules.minCgpa !== null ? `${rules.minCgpa} CGPA` : ""].filter(Boolean).join(" or ");
  const school = profile.education.filter(isSchool);
  const entries = rules.marksThroughout ? [degreeEntry(profile), ...school] : [degreeEntry(profile)];
  const outcomes = entries.map((e) => (e ? meetsCutoff(parseMarks(e.gpa), rules) : "unknown"));
  // Throughout means Class 10 and 12 too; fewer than two school entries leaves one unconfirmed.
  if (rules.marksThroughout && school.length < 2) outcomes.push("unknown");
  const facts = entries.filter((e): e is Education => Boolean(e?.gpa)).map((e) => `${e.degree}: ${e.gpa}`);
  return {
    requirement: `Marks: ${cutoff}${rules.marksThroughout ? " throughout (Class 10, 12 and degree)" : ""}`,
    status: outcomes.includes("unmet") ? "unmet" : outcomes.includes("unknown") ? "unknown" : "met",
    listingQuote: null,
    profileFact: facts.length ? facts.join("; ") : null,
  };
}

/** Evidence for the academic rules a listing states; empty when it states none. */
export function academicEvidence(profile: Profile, rules: EligibilityRules): Evidence[] {
  const evidence: Evidence[] = [];
  if (rules.minCgpa !== null || rules.minPercent !== null) evidence.push(marksEvidence(profile, rules));

  if (rules.maxBacklogs !== null) {
    const backlogs = profile.activeBacklogs ?? null;
    evidence.push({
      requirement: rules.maxBacklogs === 0 ? "No active backlogs" : `At most ${rules.maxBacklogs} active backlogs`,
      status: backlogs === null ? "unknown" : backlogs <= rules.maxBacklogs ? "met" : "unmet",
      listingQuote: null,
      profileFact: backlogs === null ? null : `${backlogs} active backlog${backlogs === 1 ? "" : "s"}`,
    });
  }

  if (rules.branches.length > 0) {
    const allowed = new Set(rules.branches.flatMap((b) => [...branchCodes(b), b.toUpperCase()]));
    const degree = degreeEntry(profile);
    const mine = degree ? branchCodes(`${degree.degree} ${degree.field ?? ""}`) : [];
    evidence.push({
      requirement: `Branch: ${rules.branches.join(", ")}`,
      status: mine.length === 0 ? "unknown" : mine.some((c) => allowed.has(c)) ? "met" : "unmet",
      listingQuote: null,
      profileFact: degree ? [degree.degree, degree.field].filter(Boolean).join(", ") : null,
    });
  }

  if (rules.gateRequired) evidence.push(gateEvidence(profile, rules.gateYear ?? null));
  return evidence;
}

// GATE scores are tied to the exam year, and PSUs name the year they recruit through.
function gateEvidence(profile: Profile, year: number | null): Evidence {
  const requirement = year ? `GATE ${year} score` : "Valid GATE score";
  const score = profile.gateScore ?? null;
  if (score === null) return { requirement, status: "unknown", listingQuote: null, profileFact: null };
  const fact = `GATE ${profile.gateYear ?? ""} score ${score}`.replace(/\s+/g, " ");
  if (year && profile.gateYear && profile.gateYear !== year) return { requirement, status: "unmet", listingQuote: null, profileFact: fact };
  return { requirement, status: year && !profile.gateYear ? "unknown" : "met", listingQuote: null, profileFact: fact };
}

// ---------- Listing side (no-LLM extraction) ----------

type AcademicRules = Pick<
  EligibilityRules,
  "minCgpa" | "minPercent" | "marksThroughout" | "maxBacklogs" | "branches" | "gradYearMin" | "gradYearMax" | "gateRequired" | "gateYear"
>;

const GATE_RE = /\b(?:through|via|based on|on the basis of)\s+(?:a\s+)?(?:valid\s+)?GATE\b|\bGATE[\s-]*(?:20\d\d\s*)?(?:score|marks)\b|\bvalid GATE\b/i;

const MARKS_CONTEXT = /marks|aggregate|throughout|percentage|10th|12th|class|graduation|academics|ssc|hsc|\bxii?\b|cgpa|degree/i;
const NOT_MARKS = /hike|off\b|discount|equity|growth|bonus|commission|travel/i;
const THROUGHOUT_RE = /throughout|10th\s*(,|&|and)\s*12th|\bx(th)?\s*(,|&|and)\s*xii(th)?\b|ssc\s*(,|&|and)\s*hsc|(all|every) (semesters|academics)|across (all )?academics/i;
const YEARS = /((?:20[2-3]\d\s*(?:[,/&]|and|or|-)\s*)*20[2-3]\d)/.source;

function percentCutoff(t: string): Pick<AcademicRules, "minPercent" | "marksThroughout"> | null {
  for (const m of t.matchAll(/(\d{2}(?:\.\d+)?)\s*%/g)) {
    const around = t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
    const value = Number(m[1]);
    if (value >= 40 && value <= 95 && MARKS_CONTEXT.test(around) && !NOT_MARKS.test(around)) {
      return { minPercent: value, marksThroughout: THROUGHOUT_RE.test(around) };
    }
  }
  return null;
}

function batchYears(t: string): number[] {
  const m =
    t.match(new RegExp(`${YEARS}\\s*(?:batch|pass(?:ed)?[- ]?outs?|graduates)\\b`, "i")) ??
    t.match(new RegExp(`(?:batch(?:es)?(?: of)?|pass(?:ing)?[- ]?out(?: year| in)?|year of passing|yop)\\s*:?\\s*${YEARS}`, "i"));
  return m ? (m[1].match(/20[2-3]\d/g) ?? []).map(Number) : [];
}

export function extractAcademicRules(text: string): AcademicRules {
  const t = text.slice(0, 12000);
  const pct = percentCutoff(t);
  const cgpa =
    t.match(/(?:cgpa|cpi)\s*(?:of\s*)?(?:at least|minimum|min\.?|>=|≥|above|over)?\s*:?\s*(\d(?:\.\d{1,2})?)(?!\s*\/\s*4)/i) ??
    t.match(/(\d(?:\.\d{1,2})?)\s*(?:\/\s*10\s*)?(?:cgpa|cpi)\b/i);
  const backlogs = /no (active|standing|current|live|pending|outstanding) backlogs?|\bno backlogs?|zero backlogs?|without (any )?backlogs?/i.test(t)
    ? 0
    : Number(t.match(/(?:maximum|max\.?|up ?to|not more than|at most)\s*(?:of\s*)?(\d)\s*(?:active\s*)?backlogs?/i)?.[1] ?? NaN);
  const years = batchYears(t);
  // "Eligible branches: CSE, IT" or the degree line itself, "B.E/B.Tech (CSE, IT, ECE)".
  const branchWindow =
    t.match(/(?:branch(?:es)?|stream|discipline|specialization)s?\s*[:\-–]?[^.\n]{0,120}/i)?.[0] ??
    t.match(/\b(?:b\.?\s?e|b\.?\s?tech|m\.?\s?tech|mca)\b[^\n]{0,80}/i)?.[0] ??
    "";
  const anyBranch = /all (branches|streams|disciplines)|any (branch|stream|discipline)/i.test(branchWindow);
  return {
    minPercent: pct?.minPercent ?? null,
    marksThroughout: pct?.marksThroughout ?? false,
    minCgpa: cgpa && Number(cgpa[1]) >= 5 && Number(cgpa[1]) <= 10 ? Number(cgpa[1]) : null,
    maxBacklogs: Number.isNaN(backlogs) ? null : backlogs,
    branches: branchWindow && !anyBranch ? branchCodes(branchWindow) : [],
    gradYearMin: years.length ? Math.min(...years) : null,
    gradYearMax: years.length ? Math.max(...years) : null,
    gateRequired: GATE_RE.test(t),
    gateYear: GATE_RE.test(t) ? Number(t.match(/\bGATE[\s-]*(20\d\d)\b/i)?.[1] ?? NaN) || null : null,
  };
}
