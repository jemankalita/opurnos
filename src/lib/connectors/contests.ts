import { parseDate } from "../text";
import { fetchJson, fetchText, type Connector, type RawOpportunity } from "./types";

// Competitive programming contests. Ratings on these sites feed straight into Indian campus
// placements and online assessments, so upcoming rounds are worth surfacing as competitions.
// Registration stays open until the round starts, so the start time is the deadline.

const hours = (seconds: number) => `${+(seconds / 3600).toFixed(1)} hours`;

// ---------- Codeforces: the official public API ----------

type CodeforcesContest = { id: number; name: string; type: string; phase: string; durationSeconds: number; startTimeSeconds?: number };

export function mapCodeforces(c: CodeforcesContest): RawOpportunity | null {
  if (c.phase !== "BEFORE" || !c.startTimeSeconds) return null;
  const startsAt = new Date(c.startTimeSeconds * 1000);
  return {
    externalId: String(c.id),
    url: `https://codeforces.com/contests/${c.id}`,
    applyUrl: `https://codeforces.com/contestRegistration/${c.id}`,
    ats: "codeforces",
    type: "competition",
    title: c.name,
    org: "Codeforces",
    locations: ["Online"],
    remote: true,
    deadline: startsAt,
    startsAt,
    tags: ["Competitive programming", `${c.type} rules`],
    description: `${c.name}: an online Codeforces round, ${hours(c.durationSeconds)} long, scored by ${c.type} rules. Register before it starts.`,
  };
}

export const codeforces: Connector = {
  id: "codeforces",
  kind: "contest",
  label: "Codeforces rounds",
  fetch: async () => {
    const data = await fetchJson<{ status: string; result: CodeforcesContest[] }>("https://codeforces.com/api/contest.list?gym=false");
    return data.result.map(mapCodeforces).filter((o): o is RawOpportunity => o !== null);
  },
};

// ---------- CodeChef: the JSON behind codechef.com/contests ----------

type CodeChefContest = { contest_code: string; contest_name: string; contest_start_date_iso: string; contest_duration?: string };

export function mapCodeChef(c: CodeChefContest): RawOpportunity | null {
  const startsAt = parseDate(c.contest_start_date_iso);
  if (!startsAt) return null;
  const minutes = Number(c.contest_duration) || 0;
  return {
    externalId: c.contest_code,
    url: `https://www.codechef.com/${c.contest_code}`,
    applyUrl: `https://www.codechef.com/${c.contest_code}`,
    ats: "codechef",
    type: "competition",
    title: c.contest_name,
    org: "CodeChef",
    locations: ["Online"],
    remote: true,
    deadline: startsAt,
    startsAt,
    tags: ["Competitive programming"],
    description: `${c.contest_name}: an online CodeChef contest${minutes ? `, ${hours(minutes * 60)} long` : ""}. Register before it starts.`,
  };
}

export const codechef: Connector = {
  id: "codechef",
  kind: "contest",
  label: "CodeChef contests",
  fetch: async () => {
    const data = await fetchJson<{ future_contests?: CodeChefContest[] }>(
      "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
    );
    return (data.future_contests ?? []).map(mapCodeChef).filter((o): o is RawOpportunity => o !== null);
  },
};

// ---------- AtCoder: the server-rendered upcoming table on /contests (robots.txt allows it) ----------

const ATCODER_ROW =
  /<time class='fixtime fixtime-full'>([^<]+)<\/time>[\s\S]*?<a href="\/contests\/([a-z0-9_-]+)">([^<]+)<\/a><\/td>\s*<td class="text-center">(\d+):(\d+)<\/td>\s*<td class="text-center">([^<]*)<\/td>/g;

/** Rows of the "Upcoming Contests" table only; recent and permanent contests are skipped. */
export function parseAtCoder(html: string): RawOpportunity[] {
  const start = html.indexOf('id="contest-table-upcoming"');
  if (start < 0) return [];
  const table = html.slice(start, html.indexOf("</table>", start));
  return [...table.matchAll(ATCODER_ROW)].flatMap(([, time, slug, name, hh, mm, rated]) => {
    // "2026-11-07 21:00:00+0900" -> ISO 8601
    const startsAt = parseDate(time.replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
    if (!startsAt) return [];
    const minutes = Number(hh) * 60 + Number(mm);
    const range = rated.trim();
    return [
      {
        externalId: slug,
        url: `https://atcoder.jp/contests/${slug}`,
        applyUrl: `https://atcoder.jp/contests/${slug}`,
        ats: "atcoder",
        type: "competition" as const,
        title: name.trim(),
        org: "AtCoder",
        locations: ["Online"],
        remote: true,
        deadline: startsAt,
        startsAt,
        tags: ["Competitive programming", ...(range && range !== "-" ? [`Rated ${range.replace(/\s+/g, "")}`] : ["Unrated"])],
        description: `${name.trim()}: an online AtCoder contest, ${hours(minutes * 60)} long. Register before it starts.`,
      },
    ];
  });
}

export const atcoder: Connector = {
  id: "atcoder",
  kind: "contest",
  label: "AtCoder contests",
  fetch: async () => parseAtCoder(await fetchText("https://atcoder.jp/contests/?lang=en")),
};
