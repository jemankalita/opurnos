import type { OpportunityType } from "./schemas";

// Fake internships and jobs ask students for money: a "registration fee", a "refundable security
// deposit", a UPI payment. Genuine employers don't, and AICTE's internship portal bans student fees.
// Only jobs and internships are checked: conferences, exams and some summer schools charge fees legitimately.

export const SCAM_TAG = "Asks for money";
export const CYBERCRIME_HELP = "Report it on the 1930 cybercrime helpline or at cybercrime.gov.in.";

const CHECKED_TYPES = new Set<OpportunityType>(["job", "internship"]);

const FEE_PATTERNS: RegExp[] = [
  // "registration fee", "training charges", "refundable security deposit"
  /\b(registration|training|joining|processing|security|refundable|certificate|certification|onboarding|enrol?ment|kit|verification|documentation|interview|application|placement|caution)\s+(fees?|charges?|deposit|amount)\b/gi,
  // "pay Rs. 1,500", "pay ₹999 to confirm"
  /\bpay\s+(?:a\s+)?(?:rs\.?|inr|₹)\s?\d[\d,]*/gi,
  // "₹2,000 towards registration"
  /(?:rs\.?|inr|₹)\s?\d[\d,]*\s*(?:\/-\s*)?(?:as|towards|for)\s+(?:the\s+)?(?:registration|training|security|joining|processing|certificate|kit)/gi,
  // A UPI handle in a listing is someone asking to be paid.
  /\b[\w.-]{3,}@(?:okaxis|oksbi|okhdfcbank|okicici|paytm|ybl|ibl|axl|upi)\b/gi,
];

// "No registration fee", "free of cost", "we never charge" are the opposite of a red flag.
const NEGATION_BEFORE = /\b(no|not|never|zero|without|nil|free|don'?t|doesn'?t|won'?t|does not|do not|will not|is not|isn'?t)\b[^.\n]{0,25}$/i;
const NEGATION_AFTER = /^[^.\n]{0,25}\b(free|waived|not (required|applicable|charged)|nil|none)\b/i;

/** Quotes from the listing where it asks applicants for money. Empty when it doesn't. */
export function scamSignals(text: string, type: OpportunityType): string[] {
  if (!CHECKED_TYPES.has(type) || !text) return [];
  const t = text.slice(0, 20000);
  const quotes: string[] = [];
  for (const re of FEE_PATTERNS) {
    for (const m of t.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (NEGATION_BEFORE.test(t.slice(Math.max(0, start - 40), start)) || NEGATION_AFTER.test(t.slice(end, end + 30))) continue;
      quotes.push(sentenceAround(t, start, end));
    }
  }
  return [...new Set(quotes)].slice(0, 3);
}

function sentenceAround(text: string, start: number, end: number): string {
  const before = text.slice(Math.max(0, start - 120), start);
  const after = text.slice(end, end + 120);
  const head = before.split(/[.!?\n]/).pop() ?? "";
  const tail = after.split(/[.!?\n]/)[0] ?? "";
  return `${head}${text.slice(start, end)}${tail}`.replace(/\s+/g, " ").trim();
}

/** Adds the warning tag when a listing asks for money, so cards and the digest can act on it. */
export function withScamTag(tags: string[], text: string, type: OpportunityType): string[] {
  const rest = tags.filter((t) => t !== SCAM_TAG);
  return scamSignals(text, type).length ? [SCAM_TAG, ...rest] : rest;
}
