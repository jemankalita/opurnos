/**
 * End-to-end pipeline against a real (embedded) Postgres in demo mode:
 * ingest → match → radar/pipeline queries → digest email → apply state machine.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RawOpportunity } from "@/lib/connectors/types";
import { makePrefs, makeProfile } from "./fixtures";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-test-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.MODEL_API_KEY = "";
process.env.RESEND_API_KEY = "";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

const NOW = new Date();
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

function opp(id: string, overrides: Partial<RawOpportunity> = {}): RawOpportunity {
  return {
    externalId: id,
    url: `https://example.com/${id}`,
    applyUrl: `https://example.com/${id}/apply`,
    ats: "other",
    type: "hackathon",
    title: `Opportunity ${id}`,
    org: `Org ${id}`,
    locations: ["Online"],
    remote: true,
    deadline: inDays(10),
    tags: [],
    description: "Build something great.",
    ...overrides,
  };
}

const PHD_ONLY = { degreeLevels: ["phd" as const], gradYearMin: null, gradYearMax: null, countries: [], sponsorship: "unknown" as const, studentsOnly: false, minAge: null, maxAge: null, requiredSkills: [], teamSize: null, other: [] };

const LISTINGS: RawOpportunity[] = [
  opp("ml-hack", { title: "Machine Learning Hackathon", description: "Build ML systems in Python and PyTorch. Prizes for retrieval projects." }),
  opp("phd-fellow", { type: "fellowship", title: "Doctoral Fellowship", description: "Research in ML", rules: PHD_ONLY }),
  opp("closed", { title: "Closed Python Hackathon", deadline: inDays(-3) }),
  opp("senior", { type: "job", title: "Senior Staff ML Engineer", description: "python pytorch" }),
  opp("intern", { type: "internship", title: "ML Engineering Intern", description: "Python, PyTorch, React. Retrieval and latency work." }),
];

type Mods = {
  ingest: typeof import("@/lib/ingest");
  matching: typeof import("@/lib/matching");
  queries: typeof import("@/lib/queries");
  digest: typeof import("@/lib/digest");
  service: typeof import("@/lib/apply/service");
  auth: typeof import("@/lib/auth");
  tokens: typeof import("@/lib/tokens");
  db: typeof import("@/lib/db");
};
let m: Mods;
let userId: string;
const idOf = new Map<string, string>();

beforeAll(async () => {
  m = {
    ingest: await import("@/lib/ingest"),
    matching: await import("@/lib/matching"),
    queries: await import("@/lib/queries"),
    digest: await import("@/lib/digest"),
    service: await import("@/lib/apply/service"),
    auth: await import("@/lib/auth"),
    tokens: await import("@/lib/tokens"),
    db: await import("@/lib/db"),
  };
  const db = await m.db.getDb();
  const user = await m.auth.findOrCreateUser("student@example.com");
  userId = user.id;
  const profile = makeProfile();
  const resumeText = [profile.headline, ...profile.experience.flatMap((e) => e.bullets), profile.skills.join(" ")].join(". ");
  await db.insert(m.db.schema.profiles).values({
    userId,
    parsed: profile,
    resumeText,
    prefs: makePrefs({ types: ["hackathon", "fellowship", "internship", "job"] }),
    onboarded: true,
  });
}, 120_000);

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe("ingest", () => {
  it("upserts listings, dedupes ids and marks closed ones inactive", async () => {
    const count = await m.ingest.upsertOpportunities("test:feed", [...LISTINGS, LISTINGS[0]]);
    expect(count).toBe(LISTINGS.length);
    const db = await m.db.getDb();
    const rows = await db.select().from(m.db.schema.opportunities);
    rows.forEach((r) => idOf.set(r.externalId, r.id));
    expect(rows.find((r) => r.externalId === "closed")?.isActive).toBe(false);
    expect(rows.find((r) => r.externalId === "phd-fellow")?.rulesExtracted).toBe(true);
  });

  it("findOrCreateUser is idempotent and normalizeEmail validates", async () => {
    expect((await m.auth.findOrCreateUser("student@example.com")).id).toBe(userId);
    expect(m.auth.normalizeEmail("  Student@Example.COM ")).toBe("student@example.com");
    expect(m.auth.normalizeEmail("not-an-email")).toBeNull();
  });
});

describe("matching", () => {
  it("judges open candidates, skips closed and senior roles, and applies hard rules", async () => {
    const result = await m.matching.runMatching(userId, { now: NOW });
    expect(result.budgetHit).toBe(false);
    expect(result.judged).toBe(3); // ml-hack, phd-fellow, intern
    const db = await m.db.getDb();
    const matches = await db.select().from(m.db.schema.matches);
    const byOpp = new Map(matches.map((x) => [x.opportunityId, x]));
    expect(byOpp.has(idOf.get("closed")!)).toBe(false);
    expect(byOpp.has(idOf.get("senior")!)).toBe(false);
    expect(byOpp.get(idOf.get("phd-fellow")!)).toMatchObject({ verdict: "ineligible", judgedBy: "rules" });
    expect(byOpp.get(idOf.get("phd-fellow")!)!.score).toBeLessThanOrEqual(25);
    expect(byOpp.get(idOf.get("ml-hack")!)!.score).toBeGreaterThan(byOpp.get(idOf.get("phd-fellow")!)!.score);
  });

  it("re-scores instead of re-judging on the next run", async () => {
    const again = await m.matching.runMatching(userId, { now: NOW });
    expect(again.judged).toBe(0);
    expect(again.rescored).toBe(3);
  });

  it("feeds the radar, counts and public stats", async () => {
    const radar = await m.queries.getRadar(userId);
    expect(radar.map((r) => r.opportunityId)).not.toContain(idOf.get("phd-fellow"));
    expect(radar[0].score).toBeGreaterThanOrEqual(radar[radar.length - 1].score);
    const withIneligible = await m.queries.getRadar(userId, { includeIneligible: true, type: "fellowship" });
    expect(withIneligible).toHaveLength(1);
    const counts = await m.queries.getRadarCounts(userId);
    expect(counts.ineligible).toBe(1);
    const stats = await m.queries.getPublicStats();
    expect(stats.total).toBe(LISTINGS.length - 1);
    const detail = await m.queries.getOpportunityForUser(userId, idOf.get("ml-hack")!);
    expect(detail?.match?.why).toBeTruthy();
    expect(await m.queries.getOpportunityForUser(userId, "missing")).toBeNull();
  });
});

describe("digest", () => {
  it("builds signed apply links, skips ineligible, and only sends new picks once", async () => {
    const { items, opportunityIds } = await m.digest.buildDigest(userId);
    expect(opportunityIds).not.toContain(idOf.get("phd-fellow"));
    const token = new URL(items[0].applyUrl).searchParams.get("t")!;
    expect(await m.tokens.verifyToken(token, "apply")).toMatchObject({ sub: userId, opp: opportunityIds[0] });

    expect(await m.digest.sendDigest(userId)).toEqual({ sent: true, count: items.length });
    expect(await m.digest.sendDigest(userId)).toEqual({ sent: false, count: 0 });
    const db = await m.db.getDb();
    const outbox = await db.select().from(m.db.schema.outbox);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].provider).toBe("local");
    expect(outbox[0].html).toContain("Machine Learning Hackathon");
  });

  it("decides when a digest is due", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
    expect(m.digest.isDigestDue("off", null)).toBe(false);
    expect(m.digest.isDigestDue("daily", null)).toBe(true);
    expect(m.digest.isDigestDue("daily", hoursAgo(21))).toBe(true);
    expect(m.digest.isDigestDue("weekly", hoursAgo(48))).toBe(false);
  });

  it("consumes single-use tokens exactly once", async () => {
    expect(await m.tokens.consumeToken("jti-1")).toBe(true);
    expect(await m.tokens.consumeToken("jti-1")).toBe(false);
  });
});

describe("apply state machine (demo mode, handoff site)", () => {
  let appId: string;

  it("drafts and verifies materials", async () => {
    appId = await m.service.startApplication(userId, idOf.get("ml-hack")!);
    const view = await m.service.getApplicationView(userId, appId);
    expect(view.app.state).toBe("review_materials");
    expect(view.app.tailored?.coverLetter).toContain("Org ml-hack");
    expect(view.app.verifier?.claims.length).toBeGreaterThan(0);
    expect(view.steps.length).toBeGreaterThanOrEqual(3);
    expect(view.agentSupported).toBe(false);
    // Starting again returns the same in-flight application.
    expect(await m.service.startApplication(userId, idOf.get("ml-hack")!)).toBe(appId);
  });

  it("returns only new steps after a cursor", async () => {
    const all = await m.service.getApplicationView(userId, appId);
    const after = await m.service.getApplicationView(userId, appId, all.steps[all.steps.length - 1].seq);
    expect(after.steps).toHaveLength(0);
  });

  it("blocks approval while invented claims are unaccepted", async () => {
    const view = await m.service.getApplicationView(userId, appId);
    const invented = { ...view.app.tailored!, summary: "Won the Nobel Prize in Physics for quantum compilers." };
    const report = await m.service.saveMaterials(userId, appId, invented);
    const unsupported = report.claims.filter((c) => c.status === "unsupported").map((c) => c.claim);
    expect(unsupported.length).toBeGreaterThan(0);
    await expect(m.service.approveMaterials(userId, appId, [])).rejects.toMatchObject({ status: 422 });
    const result = await m.service.approveMaterials(userId, appId, unsupported);
    expect(result.state).toBe("handoff");
  });

  it("refuses edits after approval and other users' access", async () => {
    const view = await m.service.getApplicationView(userId, appId);
    await expect(m.service.saveMaterials(userId, appId, view.app.tailored!)).rejects.toMatchObject({ status: 409 });
    await expect(m.service.getApplicationView("someone-else", appId)).rejects.toMatchObject({ status: 404 });
    await expect(m.service.approveSubmit(userId, appId)).rejects.toMatchObject({ status: 409 });
  });

  it("marks a handoff as submitted and moves the pipeline card", async () => {
    await m.service.markSubmittedManually(userId, appId);
    const view = await m.service.getApplicationView(userId, appId);
    expect(view.app.state).toBe("submitted");
    const pipeline = await m.queries.getPipeline(userId);
    expect(pipeline.find((p) => p.opportunityId === idOf.get("ml-hack"))?.status).toBe("submitted");
  });

  it("can cancel, and a cancelled application can be restarted", async () => {
    const second = await m.service.startApplication(userId, idOf.get("intern")!);
    await m.service.cancelApplication(userId, second);
    expect((await m.service.getApplicationView(userId, second)).app.state).toBe("cancelled");
    const third = await m.service.startApplication(userId, idOf.get("intern")!);
    expect(third).not.toBe(second);
  });
});

describe("source lifecycle", () => {
  it("deactivates listings a source stopped publishing", async () => {
    await m.ingest.upsertOpportunities("test:feed", LISTINGS.slice(1), new Date(Date.now() + 1000));
    const db = await m.db.getDb();
    const rows = await db.select().from(m.db.schema.opportunities);
    expect(rows.find((r) => r.externalId === "ml-hack")?.isActive).toBe(false);
  });

  it("stores web scout leads as their own source", async () => {
    const n = await m.ingest.upsertScoutLeads([{ title: "Rhodes", org: "Rhodes Trust", type: "scholarship", deadline: inDays(40), url: "https://rhodes.example/apply", summary: "Oxford" }]);
    expect(n).toBe(1);
    const sources = await m.queries.getSources();
    expect(sources.find((s) => s.id === "web:scout")?.status).toBe("ok");
  });
});
