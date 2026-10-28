// Indian pay, normalised to rupees a month so a stipend can be compared with similar listings.
// Forms seen in our sources: "₹20,000–40,000/month", "₹6,00,000/year", "₹4.5 LPA", "INR 25k per month".

const MIN_SAMPLES = 10;
const LAKH = 100_000;
const ANNUAL_ABOVE = 1.5 * LAKH;

const RUPEE_RE = /₹|\binr\b|\brs\.?(?=\s?\d)|\blpa\b/i;

function amount(raw: string, suffix: string | undefined): number {
  const n = Number(raw.replace(/,/g, ""));
  if (/^k$/i.test(suffix ?? "")) return n * 1000;
  if (/^(l|lakhs?|lacs?)$/i.test(suffix ?? "")) return n * LAKH;
  return n;
}

/** Monthly pay in rupees (the middle of a range), or null when it isn't a rupee salary or stipend. */
export function monthlyInr(comp: string | null | undefined): number | null {
  if (!comp || !RUPEE_RE.test(comp) || /prize/i.test(comp)) return null;
  const nums = [...comp.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakhs?|lacs?)?\b/gi)].map((m) => amount(m[1], m[2])).filter((n) => n > 0);
  if (nums.length === 0) return null;
  const mid = nums.length > 1 ? (Math.min(...nums.slice(0, 2)) + Math.max(...nums.slice(0, 2))) / 2 : nums[0];
  if (/\blpa\b|lakhs? per annum/i.test(comp)) return Math.round((mid * (mid < 1000 ? LAKH : 1)) / 12);
  if (/year|annum|annual|\bpa\b|yr/i.test(comp)) return Math.round(mid / 12);
  if (/month|\bpm\b|\/mo/i.test(comp)) return Math.round(mid);
  // Unlabelled: stipends are monthly, but above ₹1.5 lakh it's an annual package ("₹2,40,000–3,00,000").
  return Math.round(mid > ANNUAL_ABOVE ? mid / 12 : mid);
}

export type PayComparison = { monthly: number; median: number; percentile: number; samples: number };

/** Where one listing's pay sits among comparable listings. Null when there's too little data. */
export function comparePay(comp: string | null, others: (string | null)[]): PayComparison | null {
  const monthly = monthlyInr(comp);
  if (monthly === null) return null;
  const pays = others.map(monthlyInr).filter((n): n is number => n !== null).sort((a, b) => a - b);
  if (pays.length < MIN_SAMPLES) return null;
  const below = pays.filter((p) => p < monthly).length;
  const equal = pays.filter((p) => p === monthly).length;
  return {
    monthly,
    median: pays[Math.floor(pays.length / 2)],
    percentile: Math.round(((below + equal / 2) / pays.length) * 100),
    samples: pays.length,
  };
}

export const formatInr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
