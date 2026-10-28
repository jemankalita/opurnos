/**
 * "Opens soon" watcher against a real (embedded) Postgres: baseline, change detection,
 * digest re-notification, and keeping the baseline when a page comes back empty.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { WatchedPage } from "@/lib/connectors/watched-pages";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-watch-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

// An IP literal skips DNS, so the test stays offline.
const PAGE: WatchedPage = {
  id: "surge-test",
  url: "https://93.184.216.34/surge",
  title: "SURGE Summer Research Internship",
  org: "IIT Kanpur",
  type: "research",
  locations: ["Kanpur, India"],
  tags: ["Summer research"],
  about: "IIT Kanpur's summer research internship.",
};

const page = (...lines: string[]) =>
  `<html><body><nav>Home About Contact</nav>${lines.map((l) => `<p>${l}</p>`).join("")}<footer>© 2026 IIT Kanpur. Page last updated 28-10-2026 03:52 PM</footer></body></html>`;

let html = "";

type Mods = { watch: typeof import("@/lib/page-watch"); ingest: typeof import("@/lib/ingest"); db: typeof import("@/lib/db") };
let m: Mods;

beforeAll(async () => {
  m = { watch: await import("@/lib/page-watch"), ingest: await import("@/lib/ingest"), db: await import("@/lib/db") };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) =>
      new URL(String(input)).pathname === "/robots.txt" ? new Response("", { status: 404 }) : new Response(html, { headers: { "content-type": "text/html" } }),
    ),
  );
}, 60_000);

afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("signalLines", () => {
  it("keeps date and application lines and drops chrome and timestamps", () => {
    const lines = m.watch.signalLines(page("Tentative Schedule of SURGE-2026 Internship Program: May 11, 2026 to July 10, 2026.", "• Registration opens February 02, 2026", "Our campus is lovely."));
    expect(lines).toEqual(["Tentative Schedule of SURGE-2026 Internship Program: May 11, 2026 to July 10, 2026.", "Registration opens February 02, 2026"]);
  });
});

describe("page watcher", () => {
  async function run() {
    const { and, eq } = await import("drizzle-orm");
    const result = await m.ingest.runConnector(m.watch.pageWatchConnector([PAGE]));
    const db = await m.db.getDb();
    const { schema } = m.db;
    const [opp] = await db
      .select()
      .from(schema.opportunities)
      .where(and(eq(schema.opportunities.sourceId, m.watch.PAGE_WATCH_SOURCE), eq(schema.opportunities.externalId, PAGE.id)));
    const [watch] = await db.select().from(schema.pageWatches).where(eq(schema.pageWatches.id, PAGE.id));
    return { result, opp, watch, db, schema, eq };
  }

  it("records a baseline on the first check without calling it a change", async () => {
    html = page("SURGE-2026 registration was open February 02, 2026 till February 22, 2026.");
    const { result, opp, watch } = await run();
    expect(result.ok).toBe(true);
    expect(watch.changedAt).toBeNull();
    expect(opp.tags).toContain("Watching for dates");
    expect(opp.description).toContain("No new dates yet");
  });

  it("flags the listing and re-opens it in the digest when the dates change", async () => {
    const { opp, db, schema } = await run();
    const [user] = await db.insert(schema.users).values({ email: "student@example.com" }).returning();
    await db.insert(schema.matches).values({
      userId: user.id,
      opportunityId: opp.id,
      verdict: "likely",
      score: 40,
      breakdown: {},
      why: "Research in your area.",
      judgedBy: "rules",
      status: "saved",
      emailedAt: new Date(),
    });

    html = page("SURGE-2026 registration was open February 02, 2026 till February 22, 2026.", "SURGE-2027: Opening of Online Registration Portal: February 01, 2027.");
    const after = await run();
    expect(after.watch.changedAt).not.toBeNull();
    expect(after.watch.added).toEqual(["SURGE-2027: Opening of Online Registration Portal: February 01, 2027."]);
    expect(after.opp.tags).toContain("Page updated");
    expect(after.opp.description).toContain("New on the page:\n• SURGE-2027");

    const [match] = await db.select().from(schema.matches).where(after.eq(schema.matches.userId, user.id));
    expect(match.emailedAt).toBeNull();
    expect(match.why).toContain("changed on");
    expect(match.why).toContain("SURGE-2027");
  });

  it("keeps the baseline when the page comes back with no date lines", async () => {
    const before = (await run()).watch;
    html = "<html><body>Access denied</body></html>";
    const { watch, result } = await run();
    expect(result.ok).toBe(false); // the only page failed, so the source reports it
    expect(watch.hash).toBe(before.hash);
    expect(watch.lastError).toMatch(/No date or application lines/);
  });
});
