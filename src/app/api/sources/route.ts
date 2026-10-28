import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { scrapeWebsite, websiteSourceId } from "@/lib/connectors/website";
import { getDb, schema } from "@/lib/db";
import { fail, handle, ok } from "@/lib/http";
import { upsertOpportunities } from "@/lib/ingest";
import { UnsafeUrlError } from "@/lib/safe-fetch";

const MAX_SITES_PER_USER = 10;
const THROTTLE_MS = 5_000;
const SAMPLE = 5;

const Body = z.object({
  url: z.string().trim().min(4).max(2000),
  label: z.string().trim().max(80).optional(),
  save: z.boolean().default(false),
});

// Per-user throttle (in-memory, like the magic-link one; swap for Redis when scaling out).
const lastRun = new Map<string, number>();

function normalize(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Errors we raise ourselves are written for people; anything else (DNS, TLS, resets) gets a plain message. */
function scrapeError(err: unknown): string {
  if (err instanceof UnsafeUrlError) return err.message;
  if (err instanceof Error && /robots\.txt|HTTP \d|too large|too long|redirects/.test(err.message)) return err.message;
  return "We couldn't read that site. Check the address and try again.";
}

/** Preview what a website would add (save: false), or start watching it (save: true). */
export const POST = handle(async (req: Request) => {
  const { userId } = await requireApiUser();
  const body = Body.parse(await req.json());
  const now = Date.now();
  if (now - (lastRun.get(userId) ?? 0) < THROTTLE_MS) return fail(429, "One site at a time. Try again in a few seconds.");
  lastRun.set(userId, now);

  const url = normalize(body.url);
  let result;
  try {
    result = await scrapeWebsite(url);
  } catch (err) {
    return fail(400, scrapeError(err));
  }
  const sample = result.items.slice(0, SAMPLE).map((o) => ({ title: o.title, org: o.org, type: o.type, deadline: o.deadline?.toISOString() ?? null }));
  if (!body.save) return ok({ url, methods: result.methods, count: result.items.length, sample });

  if (result.items.length === 0) {
    return fail(422, "We couldn't find any listings on that page. Try the page that lists the openings, or its RSS feed.");
  }
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.sources)
    .where(and(eq(schema.sources.kind, "website"), eq(schema.sources.addedBy, userId)));
  if (n >= MAX_SITES_PER_USER) return fail(422, `You can watch up to ${MAX_SITES_PER_USER} websites. Remove one first.`);

  const id = websiteSourceId(url);
  const label = body.label || new URL(url).hostname.replace(/^www\./, "");
  // If someone else already watches this page, it stays theirs; the listings are shared either way.
  await db.insert(schema.sources).values({ id, kind: "website", label, url, addedBy: userId, status: "running" }).onConflictDoNothing();
  const added = await upsertOpportunities(id, result.items);
  await db.update(schema.sources).set({ status: "ok", lastRunAt: new Date(), lastCount: added, lastError: null }).where(eq(schema.sources.id, id));
  return ok({ id, url, methods: result.methods, count: added });
});
