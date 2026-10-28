import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { signToken, verifyToken } from "./tokens";

// Deadlines as an iCalendar feed (RFC 5545) that Google Calendar, Apple Calendar and Outlook subscribe to.

const FEED_TTL = 60 * 60 * 24 * 365;
const EVENT_MINUTES = 60;
const LOOKBACK_DAYS = 7;
const FEED_STATUSES = ["saved", "applying", "interview"] as const;

export type CalendarEvent = { id: string; title: string; org: string; deadline: Date; url: string; detailUrl: string };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events: CalendarEvent[], name = "Opurnos deadlines", now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Opurnos//Deadlines//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(name)}`];
  for (const e of events) {
    const start = new Date(e.deadline.getTime() - EVENT_MINUTES * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@opurnos`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(e.deadline)}`,
      `SUMMARY:${escapeText(`Deadline: ${e.title} (${e.org})`)}`,
      `DESCRIPTION:${escapeText(`Applications close at this time.\nApply: ${e.url}\nOn Opurnos: ${e.detailUrl}`)}`,
      `URL:${e.detailUrl}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-P1D",
      `DESCRIPTION:${escapeText(`${e.title} closes tomorrow`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Deadlines of what the person saved or is applying to, including ones that just passed. */
export async function calendarEvents(userId: string, now = new Date()): Promise<CalendarEvent[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.opportunities.id,
      title: schema.opportunities.title,
      org: schema.opportunities.org,
      deadline: schema.opportunities.deadline,
      applyUrl: schema.opportunities.applyUrl,
      url: schema.opportunities.url,
    })
    .from(schema.matches)
    .innerJoin(schema.opportunities, eq(schema.matches.opportunityId, schema.opportunities.id))
    .where(
      and(
        eq(schema.matches.userId, userId),
        inArray(schema.matches.status, [...FEED_STATUSES]),
        isNotNull(schema.opportunities.deadline),
        gte(schema.opportunities.deadline, new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000)),
      ),
    );
  return rows.map((r) => toEvent({ id: r.id, title: r.title, org: r.org, deadline: r.deadline!, url: r.applyUrl ?? r.url }));
}

export function toEvent(o: { id: string; title: string; org: string; deadline: Date; url: string }): CalendarEvent {
  return { ...o, detailUrl: `${env.APP_URL}/o/${o.id}` };
}

/** A private, long-lived subscription link; anyone with it can read the person's saved deadlines. */
export async function calendarFeedUrl(userId: string): Promise<string> {
  const token = await signToken({ sub: userId }, "calendar", FEED_TTL);
  return `${env.APP_URL}/api/calendar/feed/${encodeURIComponent(token)}`;
}

export async function userForFeedToken(token: string): Promise<string | null> {
  const verified = await verifyToken(token, "calendar");
  return verified?.sub ?? null;
}

export function icsResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, max-age=900",
    },
  });
}
