import { createHash } from "node:crypto";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** Converts listing HTML (possibly entity-escaped, as Greenhouse returns it) to readable plain text. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = html.includes("&lt;") ? decodeEntities(html) : html;
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|section|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(s)
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

/** Stable cross-source identity for an opportunity, used for dedupe. */
export function contentHash(org: string, title: string, extra = ""): string {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return sha1(`${norm(org)}|${norm(title)}|${norm(extra)}`);
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1)}…`;
}

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or our the to we with you your will this that who can all any into more than they their them about over under using use new work team role".split(
    " ",
  ),
);

// Multi-word fields that mean nothing when split ("learning" alone matches "The Learning Stage").
const PHRASES: [RegExp, string][] = [
  [/\bmachine[\s-]+learning\b/g, " ml "],
  [/\bartificial[\s-]+intelligence\b/g, " ai "],
  [/\bcomputer[\s-]+science\b/g, " cs "],
  [/\bnatural[\s-]+language[\s-]+processing\b/g, " nlp "],
];

/** Lowercased content tokens (letters, digits, + and #, so "c++" and "c#" survive). */
export function tokenize(input: string): string[] {
  const text = PHRASES.reduce((s, [re, to]) => s.replace(re, to), input.toLowerCase());
  return (text.match(/[a-z0-9+#.]+/g) ?? [])
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d =
    typeof value === "number"
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
