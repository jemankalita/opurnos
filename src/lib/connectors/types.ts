import type { EligibilityRules, OpportunityType } from "../schemas";

export type RawOpportunity = {
  externalId: string;
  url: string;
  applyUrl: string | null;
  ats: string | null;
  type: OpportunityType;
  title: string;
  org: string;
  orgLogo?: string | null;
  locations: string[];
  remote: boolean;
  deadline: Date | null;
  startsAt?: Date | null;
  postedAt?: Date | null;
  comp?: string | null;
  tags: string[];
  description: string;
  /** Set when the source already gives structured eligibility (no LLM extraction needed). */
  rules?: EligibilityRules | null;
};

export type Connector = {
  id: string;
  kind: string;
  label: string;
  fetch: () => Promise<RawOpportunity[]>;
};

const UA = "OpurnosBot/0.1 (+https://github.com/opurnos; opportunity discovery for students)";

type FetchOptions = { timeoutMs?: number; retries?: number; body?: unknown };

export function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  return fetchWithRetry(url, "application/json", opts, (res) => res.json() as Promise<T>);
}

export function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  return fetchWithRetry(url, "text/html", opts, (res) => res.text());
}

/** GET by default; passing `body` sends it as a JSON POST. */
async function fetchWithRetry<T>(
  url: string,
  accept: string,
  { timeoutMs = 20_000, retries = 2, body }: FetchOptions,
  read: (res: Response) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers: { "user-agent": UA, accept, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 404) throw new Error(`404 ${url}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await read(res);
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message.startsWith("404")) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const INTERN_RE = /\b(intern|internship|co-?op|summer analyst|placement|industrial trainee|spring week)\b/i;
const RESEARCH_RE = /\b(research (scientist|engineer|fellow|assistant)|phd|postdoc)\b/i;
const FELLOW_RE = /\bfellow(ship)?\b/i;

export function classifyJob(title: string): OpportunityType {
  if (INTERN_RE.test(title)) return "internship";
  if (FELLOW_RE.test(title)) return "fellowship";
  if (RESEARCH_RE.test(title)) return "research";
  return "job";
}

/** Titles or posts aimed at students and recent graduates. */
export const EARLY_CAREER_RE = /\b(intern(ship)?s?|co-?op|new grad(uate)?s?|junior|entry[- ]level|early[- ]career|graduate program|university grad(uate)?|apprentice(ship)?|fellow(ship)?|residency|student)\b/i;

export const SENIOR_RE = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|vice president|architect|distinguished)\b/i;
