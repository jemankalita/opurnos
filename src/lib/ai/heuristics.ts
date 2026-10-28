// Deterministic stand-ins for each agent. They run in demo mode (no MODEL_API_KEY) and as a
// fallback when a model call fails, so the product degrades instead of breaking.
import { tokenize, truncate } from "../text";
import type { RuleCheck } from "../eligibility";
import {
  EMPTY_RULES,
  type EligibilityRules,
  type Judgement,
  type Profile,
  type Tailored,
  type VerifierReport,
} from "../schemas";

const SKILL_LEXICON = [
  "python", "java", "javascript", "typescript", "c++", "c#", "c", "go", "rust", "kotlin", "swift", "sql", "r",
  "matlab", "react", "next.js", "node.js", "vue", "angular", "django", "flask", "fastapi", "spring", "pytorch",
  "tensorflow", "jax", "scikit-learn", "pandas", "numpy", "opencv", "llm", "nlp", "computer vision",
  "machine learning", "deep learning", "reinforcement learning", "data science", "statistics", "aws", "gcp",
  "azure", "docker", "kubernetes", "terraform", "linux", "git", "postgresql", "mongodb", "redis", "kafka",
  "spark", "graphql", "rest", "figma", "ros", "embedded", "verilog", "fpga", "solidity", "web3", "unity",
  "android", "ios", "flutter", "tailwind", "html", "css", "excel", "tableau", "power bi", "cuda", "langchain",
];

const COUNTRY_WORDS: Record<string, string> = {
  india: "IN", "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB", canada: "CA",
  germany: "DE", singapore: "SG", australia: "AU", france: "FR", netherlands: "NL", japan: "JP",
  bangalore: "IN", bengaluru: "IN", mumbai: "IN", delhi: "IN", hyderabad: "IN", pune: "IN", chennai: "IN",
  guwahati: "IN", kolkata: "IN", london: "GB", "new york": "US", "san francisco": "US", toronto: "CA",
};

const INTEREST_MAP: Record<string, string> = {
  pytorch: "machine learning", tensorflow: "machine learning", llm: "generative AI", nlp: "NLP",
  "computer vision": "computer vision", opencv: "computer vision", ros: "robotics", embedded: "hardware",
  fpga: "hardware", solidity: "web3", web3: "web3", react: "web development", "next.js": "web development",
  "data science": "data science", statistics: "quant", kubernetes: "infrastructure", unity: "games",
};

function findCountry(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [word, code] of Object.entries(COUNTRY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return code;
  }
  return null;
}

function degreeLevel(line: string): Profile["education"][number]["level"] {
  const l = line.toLowerCase();
  if (/\bph\.?d\b|doctor/.test(l)) return "phd";
  if (/\bm\.?s\b|\bm\.?tech\b|master|\bmba\b|\bm\.?sc\b/.test(l)) return "masters";
  if (/\bb\.?s\b|\bb\.?tech\b|\bb\.?e\b|bachelor|\bb\.?sc\b|undergrad/.test(l)) return "bachelors";
  if (/high school|secondary|class xii|12th/.test(l)) return "high_school";
  return "other";
}

const SECTION_RE =
  /^(summary|profile|about( me)?|objective|education|academics|(work |professional )?experience|employment|internships?|projects?|(technical )?skills|achievements|awards|honou?rs|publications|certifications|leadership|activities)\s*:?$/i;
const BULLET_RE = /^[•\-▪●*–]\s*/;
const ROLE_RE = /\b(intern|engineer|developer|researcher|analyst|assistant|lead|founder|scientist|designer|consultant|fellow)\b/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function canonicalSection(h: string): string {
  if (/summary|profile|about|objective/.test(h)) return "summary";
  if (/education|academics/.test(h)) return "education";
  if (/experience|employment|internship/.test(h)) return "experience";
  if (/project/.test(h)) return "projects";
  if (/skill/.test(h)) return "skills";
  return "achievements";
}

/** Groups resume lines under their section heading ("" = header block before the first heading). */
function sectionize(lines: string[]): Map<string, string[]> {
  const sections = new Map<string, string[]>([["", []]]);
  let current = "";
  for (const line of lines) {
    const m = line.length < 40 ? line.match(SECTION_RE) : null;
    if (m) {
      current = canonicalSection(m[1].toLowerCase());
      if (!sections.has(current)) sections.set(current, []);
    } else {
      sections.get(current)!.push(line);
    }
  }
  return sections;
}

function toYearMonth(raw: string | undefined): string | null {
  if (!raw) return null;
  if (/present|current|now/i.test(raw)) return "present";
  const year = raw.match(/20\d\d/)?.[0];
  const month = MONTHS.findIndex((m) => raw.toLowerCase().includes(m));
  return year ? `${year}-${String(month >= 0 ? month + 1 : 1).padStart(2, "0")}` : null;
}

function skillsIn(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_LEXICON.filter((s) => {
    const escaped = s.replace(/[.+#]/g, (c) => `\\${c}`);
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(lower);
  });
}

function parseEducation(lines: string[], allYears: number[]): Profile["education"] {
  const eduLines = lines.filter((l) => /universit|institute|college|school|iit|nit\b|iiit|academy/i.test(l));
  return eduLines.slice(0, 2).map((line, i) => {
    const idx = lines.indexOf(line);
    const near = lines.slice(idx, idx + 3).join(" ");
    const parts = line.split(/\s+[—–-]\s+|,\s+/);
    const nearYears = (near.match(/\b(20[1-3]\d)\b/g) ?? []).map(Number);
    return {
      school: truncate(parts[0], 120),
      degree: truncate((parts[1] ?? lines[idx + 1] ?? "").replace(/,?\s*(expected|class of|graduat).*$/i, "").trim(), 120),
      level: degreeLevel(near),
      field: /computer|cs\b|software/i.test(near) ? "Computer Science" : /electric|electronic/i.test(near) ? "Electrical Engineering" : null,
      gradYear: nearYears.length ? Math.max(...nearYears) : i === 0 && allYears.length ? Math.max(...allYears) : null,
      gpa: near.match(/(\d\.\d{1,2})\s*\/\s*(4|10)(\.0)?/)?.[0] ?? null,
    };
  });
}

/** "Role, Org (May 2026 – Jul 2026)" headers, each owning the bullets that follow it. */
function parseExperience(lines: string[]): Profile["experience"] {
  const out: Profile["experience"] = [];
  for (const line of lines) {
    if (BULLET_RE.test(line)) {
      out.at(-1)?.bullets.push(line.replace(BULLET_RE, ""));
      continue;
    }
    if (!ROLE_RE.test(line) || line.length > 140 || out.length >= 6) continue;
    const dates = line.match(/\(([^)]*)\)/)?.[1] ?? "";
    const [startRaw, endRaw] = dates.split(/\s*[–-]\s*/);
    const head = line.replace(/\(.*\)/, "").trim();
    const [title, ...rest] = head.split(/,\s*|\s+at\s+|\s+[|@]\s+/);
    out.push({ title: truncate(title.trim(), 80), org: truncate(rest.join(", ").trim() || "—", 80), start: toYearMonth(startRaw), end: toYearMonth(endRaw), bullets: [] });
  }
  return out;
}

function parseProjects(lines: string[]): Profile["projects"] {
  return lines
    .filter((l) => !BULLET_RE.test(l))
    .slice(0, 6)
    .map((l) => {
      const [name, ...desc] = l.split(/\s+[—–-]\s+|:\s+/);
      return { name: truncate(name.trim(), 80), description: truncate(desc.join(" — ").trim() || l, 300), tech: skillsIn(l), url: l.match(/https?:\/\/\S+/)?.[0] ?? null };
    });
}

function headlineFrom(summary: string, education: Profile["education"], skills: string[]): string {
  if (summary) return truncate(summary.split(/(?<=\.)\s/)[0].replace(/\.$/, ""), 140);
  if (education[0]) return `${education[0].degree || "Student"} at ${education[0].school}`;
  return skills.length ? `Builder working with ${skills.slice(0, 3).join(", ")}` : "Early-career builder";
}

export function parseResumeHeuristic(text: string): Profile {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections = sectionize(lines);
  const sec = (k: string) => sections.get(k) ?? [];
  const pick = (k: string, fallback: string[]) => (sec(k).length ? sec(k) : fallback);
  const years = (text.match(/\b(20[1-3]\d)\b/g) ?? []).map(Number);
  const skills = skillsIn(text);
  const education = parseEducation(pick("education", lines), years);
  const contact = sec("").slice(1).join(" | ");
  const location = contact.split(/\s*\|\s*/).find((part) => findCountry(part) && !/@|\.com/.test(part)) ?? null;
  const interests = [...new Set(skills.map((s) => INTEREST_MAP[s]).filter(Boolean))].slice(0, 6);
  const achievementLines = pick("achievements", lines.filter((l) => /\b(winner|won|award|finalist|rank|scholar|published)\b/i.test(l)));

  return {
    name: lines[0] && lines[0].length < 60 && !/@/.test(lines[0]) ? lines[0] : "Your name",
    email: text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null,
    phone: text.match(/(\+?\d[\d\s-]{8,14}\d)/)?.[0]?.trim() ?? null,
    location,
    country: findCountry(location ?? text),
    links: [...new Set(text.match(/(https?:\/\/[^\s)|]+|(?:github|linkedin)\.com\/[^\s)|]+)/gi) ?? [])],
    headline: headlineFrom(sec("summary").join(" "), education, skills),
    education,
    experience: parseExperience(pick("experience", lines.filter((l) => !sec("summary").includes(l)))),
    projects: parseProjects(sec("projects")),
    skills,
    achievements: achievementLines.flatMap((l) => l.split(/(?<=\.)\s+/)).map((l) => l.replace(BULLET_RE, "")).filter(Boolean).slice(0, 6),
    interests: interests.length ? interests : ["software"],
  };
}

const LEVEL_PATTERNS: Array<[RegExp, EligibilityRules["degreeLevels"][number]]> = [
  [/\b(bachelor'?s|undergraduate|b\.?s\.?|b\.?tech|b\.?e\.)\b/i, "bachelors"],
  [/\b(master'?s|m\.?s\.?|graduate student|m\.?tech)\b/i, "masters"],
  [/\b(ph\.?d|doctoral)\b/i, "phd"],
  [/\bhigh school\b/i, "high_school"],
];

const COUNTRY_RULES: Array<[RegExp, string]> = [
  [/\b(u\.?s\.? citizens?|authori[sz]ed to work in the (u\.?s|united states)|us work authori[sz]ation)\b/i, "US"],
  [/\b(indian (citizens|nationals|students)|resident of india|students in india)\b/i, "IN"],
  [/\b(uk residents?|right to work in the uk)\b/i, "GB"],
  [/\b(canadian citizens|permanent residents of canada)\b/i, "CA"],
];

export function extractRulesHeuristic(text: string): EligibilityRules {
  const rules: EligibilityRules = structuredClone(EMPTY_RULES);
  const t = text.slice(0, 12000);
  const requirementWindow = t.match(/(requirement|qualification|eligib|who can apply|you have|you are)[\s\S]{0,2500}/i)?.[0] ?? "";
  for (const [re, level] of LEVEL_PATTERNS) {
    if (re.test(requirementWindow) && /(pursuing|enrolled|currently|student)/i.test(requirementWindow)) {
      rules.degreeLevels.push(level);
    }
  }
  const grad = t.match(/graduat\w*[^.\n]{0,60}?\b(20[2-3]\d)\b(?:[^.\n]{0,30}?\b(20[2-3]\d)\b)?/i);
  if (grad) {
    const a = Number(grad[1]);
    const b = grad[2] ? Number(grad[2]) : a;
    rules.gradYearMin = Math.min(a, b);
    rules.gradYearMax = Math.max(a, b);
  }
  for (const [re, code] of COUNTRY_RULES) if (re.test(t)) rules.countries.push(code);
  if (/(not (be )?able to|unable to|cannot|will not|do not) (provide |offer )?(visa )?sponsor/i.test(t)) rules.sponsorship = "not_offered";
  else if (/(visa sponsorship (is )?(available|provided|offered)|we sponsor visas)/i.test(t)) rules.sponsorship = "offered";
  rules.studentsOnly = /(open to|only for|must be) (all )?(current(ly enrolled)? )?(university |college )?students/i.test(t);
  const team = t.match(/teams? (size )?of (\d)\s*(?:-|to|–)\s*(\d)/i);
  if (team) rules.teamSize = `${team[2]}-${team[3]}`;
  return rules;
}

// tokenize() folds these phrases into short tokens; spell them out for people.
const KEYWORD_LABEL: Record<string, string> = { ml: "machine learning", ai: "AI", cs: "computer science", nlp: "NLP" };

export function judgeHeuristic(input: {
  fit: number;
  rulesCheck: RuleCheck;
  title: string;
  org: string;
  type: string;
  hasPrize: boolean;
  matchedKeywords: string[];
}): Judgement {
  const { fit, rulesCheck } = input;
  const verdict = rulesCheck.verdict === "ineligible" ? "ineligible" : fit < 0.25 ? "stretch" : rulesCheck.verdict;
  const topSkills = input.matchedKeywords.slice(0, 3).map((k) => KEYWORD_LABEL[k] ?? k).join(", ");
  const why =
    verdict === "ineligible"
      ? `You don't meet: ${rulesCheck.evidence.filter((e) => e.status === "unmet").map((e) => e.requirement).join("; ")}.`
      : topSkills
        ? `Your ${topSkills} background lines up with this ${input.type} at ${input.org}.`
        : `A ${input.type} at ${input.org} that fits the areas you picked.`;
  return {
    verdict,
    fit,
    value: input.hasPrize ? 0.7 : 0.5,
    why,
    evidence: rulesCheck.evidence,
    gaps: rulesCheck.evidence.filter((e) => e.status === "unmet").map((e) => e.requirement),
  };
}

export function tailorHeuristic(profile: Profile, opp: { title: string; org: string; description: string }): Tailored {
  const oppTokens = new Set(tokenize(`${opp.title} ${opp.description}`));
  const allBullets = profile.experience.flatMap((e) => e.bullets.map((b) => ({ section: e.org || e.title, text: b })));
  const scored = allBullets
    .map((b) => ({ ...b, s: tokenize(b.text).filter((t) => oppTokens.has(t)).length }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ section, text }) => ({ section, text }));
  const matched = profile.skills.filter((s) => oppTokens.has(s.toLowerCase())).slice(0, 4);
  const skillLine = matched.length ? matched.join(", ") : profile.skills.slice(0, 4).join(", ");
  return {
    summary: `${profile.headline}. Hands-on with ${skillLine || "building real projects"}.`,
    bullets: scored,
    coverLetter: [
      `Dear ${opp.org} team,`,
      ``,
      `The ${opp.title} stood out to me because it sits right where my work has been heading. A quick introduction: ${profile.headline}.`,
      ``,
      [
        scored[0] ? `The work I'd point to first: ${scored[0].text.replace(/[.\s]*$/, ".")}` : ``,
        skillLine ? `I work day to day with ${skillLine}, and I'd bring that directly to this role.` : ``,
      ]
        .filter(Boolean)
        .join(" "),
      ``,
      `Thank you for considering my application.`,
      ``,
      profile.name,
    ]
      .filter((l, i, arr) => l !== "" || arr[i - 1] !== "")
      .join("\n"),
    answers: [
      { question: `Why ${opp.org}?`, answer: `The ${opp.title} matches what I've been building: ${skillLine}.` },
      { question: "Tell us about a project you're proud of", answer: scored[0]?.text ?? profile.headline },
    ],
  };
}

// A trailing full stop is punctuation, not part of the number; unit letters must stand alone ("2k", not "30 minutes").
const NUMBER_RE = /\b\d+(?:[.,]\d+)*(?:\s*(?:%|\+|[xkm]\b))?/gi;

/** Flags sentences whose content words or numbers don't appear in the resume. */
export function verifyHeuristic(tailored: Tailored, resumeText: string): VerifierReport {
  const resumeLower = resumeText.toLowerCase();
  const resumeTokens = new Set(tokenize(resumeText));
  const sentences = [tailored.summary, ...tailored.bullets.map((b) => b.text)]
    .flatMap((s) => s.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  return {
    claims: sentences.map((claim) => {
      const numbers = (claim.match(NUMBER_RE) ?? []).map((n) => n.trim().toLowerCase());
      const missingNumber = numbers.find((n) => !resumeLower.includes(n.replace(/\s+/g, "")));
      const tokens = tokenize(claim);
      const overlap = tokens.length ? tokens.filter((t) => resumeTokens.has(t)).length / tokens.length : 1;
      if (missingNumber) {
        return { claim, status: "unsupported" as const, source: null, note: `"${missingNumber}" does not appear in your resume.` };
      }
      if (overlap >= 0.75) return { claim, status: "supported" as const, source: null, note: null };
      if (overlap >= 0.45) return { claim, status: "rephrased" as const, source: null, note: "Reworded from your resume." };
      return { claim, status: "unsupported" as const, source: null, note: "Most of this wording isn't backed by your resume." };
    }),
  };
}
