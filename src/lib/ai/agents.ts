import { env, isDemoMode } from "../env";
import { profileForPrompt } from "../profile";
import { truncate } from "../text";
import type { RuleCheck } from "../eligibility";
import {
  REFERRAL_NOTE_MAX,
  EligibilityRulesSchema,
  JudgementSchema,
  ProfileSchema,
  ReferralSchema,
  TailoredSchema,
  VerifierReportSchema,
  type EligibilityRules,
  type Judgement,
  type OpportunityType,
  type Preferences,
  type Profile,
  type Referral,
  type Tailored,
  type VerifierReport,
} from "../schemas";
import { BudgetExceededError, searchGrounded, structured } from "./client";
import * as H from "./heuristics";
import * as P from "./prompts";

export type AgentResult<T> = { value: T; by: string };

async function withFallback<T>(kind: string, model: string, run: () => Promise<T>, fallback: () => T): Promise<AgentResult<T>> {
  if (isDemoMode) return { value: fallback(), by: "rules" };
  try {
    return { value: await run(), by: model };
  } catch (err) {
    if (err instanceof BudgetExceededError) throw err;
    console.error(`[agent:${kind}] falling back to rules:`, err instanceof Error ? err.message : err);
    return { value: fallback(), by: "rules" };
  }
}

// ---------------- Profile Parser ----------------

export async function parseResume(input: {
  userId: string;
  text: string;
  pdfBase64?: string | null;
  fileName?: string | null;
}): Promise<AgentResult<Profile>> {
  const model = env.MODEL_DEFAULT;
  return withFallback(
    "parse_resume",
    model,
    async () => {
      // Muse Spark reads PDFs natively (layout, columns, tables); fall back to extracted text.
      if (input.pdfBase64) {
        try {
          return await structured({
            kind: "parse_resume",
            userId: input.userId,
            system: P.PARSE_RESUME_V3,
            schema: ProfileSchema,
            schemaName: "profile",
            user: [
              { type: "text", text: "Parse this resume." },
              {
                type: "file",
                file: { filename: input.fileName ?? "resume.pdf", file_data: `data:application/pdf;base64,${input.pdfBase64}` },
              },
            ],
          });
        } catch (err) {
          console.warn("[agent:parse_resume] PDF input failed, retrying with text:", err instanceof Error ? err.message : err);
        }
      }
      return structured({
        kind: "parse_resume",
        userId: input.userId,
        system: P.PARSE_RESUME_V3,
        schema: ProfileSchema,
        schemaName: "profile",
        user: `Resume text:\n"""\n${truncate(input.text, 30000)}\n"""`,
      });
    },
    () => H.parseResumeHeuristic(input.text),
  );
}

// ---------------- Extractor (public data → contributor model) ----------------

export async function extractRules(opp: { title: string; org: string; description: string }): Promise<AgentResult<EligibilityRules>> {
  const model = env.MODEL_PUBLIC;
  return withFallback(
    "extract_rules",
    model,
    () =>
      structured({
        kind: "extract_rules",
        userId: null,
        model,
        system: P.EXTRACT_RULES_V3,
        schema: EligibilityRulesSchema,
        schemaName: "eligibility_rules",
        temperature: 0,
        user: `Title: ${opp.title}\nOrganisation: ${opp.org}\n\nListing:\n"""\n${truncate(opp.description, 12000)}\n"""`,
      }),
    () => H.extractRulesHeuristic(opp.description),
  );
}

// ---------------- Eligibility Judge ----------------

export type JudgeInput = {
  userId: string;
  profile: Profile;
  prefs: Preferences;
  opp: {
    title: string;
    org: string;
    type: OpportunityType;
    description: string;
    deadline: Date | null;
    locations: string[];
    remote: boolean;
    comp: string | null;
  };
  rulesCheck: RuleCheck;
  fit: number;
  matchedKeywords: string[];
};

export async function judge(input: JudgeInput): Promise<AgentResult<Judgement>> {
  const model = env.MODEL_DEFAULT;
  const { opp } = input;
  return withFallback(
    "judge",
    model,
    () =>
      structured({
        kind: "judge",
        userId: input.userId,
        system: P.JUDGE_V1,
        schema: JudgementSchema,
        schemaName: "judgement",
        temperature: 0,
        user: [
          `Today: ${new Date().toISOString().slice(0, 10)}`,
          `PROFILE:\n${profileForPrompt(input.profile, input.prefs)}`,
          `OPPORTUNITY (${opp.type}): ${opp.title} — ${opp.org}`,
          `Locations: ${opp.locations.join("; ") || "unspecified"}${opp.remote ? " (remote ok)" : ""}`,
          `Deadline: ${opp.deadline ? opp.deadline.toISOString().slice(0, 10) : "rolling/unknown"}`,
          opp.comp ? `Compensation/prize: ${opp.comp}` : "",
          `Hard-rule pre-check (deterministic): ${JSON.stringify(input.rulesCheck.evidence)}`,
          `LISTING:\n"""\n${truncate(opp.description, 9000)}\n"""`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      }),
    () =>
      H.judgeHeuristic({
        fit: input.fit,
        rulesCheck: input.rulesCheck,
        title: opp.title,
        org: opp.org,
        type: opp.type,
        hasPrize: Boolean(opp.comp),
        matchedKeywords: input.matchedKeywords,
      }),
  );
}

// ---------------- Tailor + Truthfulness Verifier ----------------

export async function tailor(input: {
  userId: string;
  profile: Profile;
  resumeText: string;
  opp: { title: string; org: string; description: string; type: string };
}): Promise<AgentResult<Tailored>> {
  const model = env.MODEL_DEFAULT;
  return withFallback(
    "tailor",
    model,
    () =>
      structured({
        kind: "tailor",
        userId: input.userId,
        system: P.TAILOR_V1,
        schema: TailoredSchema,
        schemaName: "tailored",
        temperature: 0.4,
        user: `RESUME (the only source of truth):\n"""\n${truncate(input.resumeText, 20000)}\n"""\n\nOPPORTUNITY (${input.opp.type}): ${input.opp.title} at ${input.opp.org}\n"""\n${truncate(input.opp.description, 8000)}\n"""`,
      }),
    () => H.tailorHeuristic(input.profile, input.opp),
  );
}

export async function verify(input: { userId: string; tailored: Tailored; resumeText: string }): Promise<AgentResult<VerifierReport>> {
  const model = env.MODEL_DEFAULT;
  const material = [
    `SUMMARY: ${input.tailored.summary}`,
    ...input.tailored.bullets.map((b) => `BULLET (${b.section}): ${b.text}`),
    `COVER LETTER:\n${input.tailored.coverLetter}`,
    ...input.tailored.answers.map((a) => `ANSWER to "${a.question}": ${a.answer}`),
  ].join("\n");
  return withFallback(
    "verify",
    model,
    () =>
      structured({
        kind: "verify",
        userId: input.userId,
        system: P.VERIFY_V1,
        schema: VerifierReportSchema,
        schemaName: "verifier_report",
        temperature: 0,
        user: `RESUME:\n"""\n${truncate(input.resumeText, 20000)}\n"""\n\nTAILORED MATERIALS:\n"""\n${material}\n"""`,
      }),
    () => H.verifyHeuristic(input.tailored, input.resumeText),
  );
}

// ---------------- Referral Writer ----------------

export async function draftReferral(input: {
  userId: string;
  profile: Profile;
  prefs: Preferences;
  opp: { title: string; org: string; description: string };
}): Promise<AgentResult<Referral>> {
  const model = env.MODEL_DEFAULT;
  return withFallback(
    "referral",
    model,
    async () => {
      const draft = await structured({
        kind: "referral",
        userId: input.userId,
        system: P.REFERRAL_V1,
        schema: ReferralSchema,
        schemaName: "referral",
        temperature: 0.4,
        user: `PROFILE:\n${profileForPrompt(input.profile, input.prefs)}\n\nROLE: ${input.opp.title} at ${input.opp.org}\n"""\n${truncate(input.opp.description, 4000)}\n"""`,
      });
      // The note limit is LinkedIn's, not a style preference; never hand back one it would reject.
      return { ...draft, note: draft.note.slice(0, REFERRAL_NOTE_MAX) };
    },
    () => H.referralHeuristic(input.profile, input.opp),
  );
}

// ---------------- Web Scout ----------------

export type ScoutLead = {
  title: string;
  org: string;
  type: OpportunityType;
  deadline: Date | null;
  url: string;
  summary: string;
};

const SCOUT_TYPES = new Set<OpportunityType>([
  "fellowship", "scholarship", "research", "conference", "grant", "hackathon", "internship", "competition",
]);

export function parseScoutLines(text: string, now = new Date()): ScoutLead[] {
  const leads: ScoutLead[] = [];
  for (const raw of text.split("\n")) {
    const parts = raw.replace(/^[\s\-*\d.]+/, "").split("|").map((p) => p.trim());
    if (parts.length < 5) continue;
    const [title, org, typeRaw, deadlineRaw, url, summary = ""] = parts;
    const type = typeRaw.toLowerCase() as OpportunityType;
    if (!SCOUT_TYPES.has(type) || !/^https?:\/\//.test(url)) continue;
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw) ? new Date(`${deadlineRaw}T23:59:00Z`) : null;
    if (deadline && deadline < now) continue;
    leads.push({ title, org, type, deadline, url: url.replace(/[).,]+$/, ""), summary });
  }
  return leads;
}

export async function scout(input: { userId: string; profile: Profile; prefs: Preferences }): Promise<ScoutLead[]> {
  if (isDemoMode) return [];
  const edu = input.profile.education[0];
  const { text, citations } = await searchGrounded({
    kind: "scout",
    userId: input.userId,
    instructions: P.SCOUT_V1,
    country: input.profile.country,
    input: P.scoutQueries({
      headline: input.profile.headline,
      level: edu?.level ?? null,
      field: edu?.field ?? null,
      gradYear: edu?.gradYear ?? null,
      country: input.profile.country,
      interests: input.profile.interests,
      types: input.prefs.types.filter((t) => t !== "job"),
    }),
  });
  const cited = new Set(citations.map((c) => safeHost(c.url)));
  // Keep only leads whose domain the search actually cited; uncited URLs may be hallucinated.
  return parseScoutLines(text).filter((l) => cited.has(safeHost(l.url)));
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
