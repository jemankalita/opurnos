import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { and, desc, eq, gte, max, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { env } from "../env";
import { HttpError } from "../auth";
import { requireFeature } from "../plans";
import { tailor, verify } from "../ai/agents";
import type { ApplicationState, Tailored } from "../schemas";
import { closeSession, getSession, keepSession, launchBrowser, screenshot, snapshotFields, submitForm } from "./browser";
import { runFillAgent, type StepLogger } from "./agent";

/** ATSs whose standard guest-apply forms the agent supports end to end. */
export const AGENT_ATS = new Set(["greenhouse", "lever", "ashby"]);

async function loadOwned(userId: string, applicationId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ app: schema.applications, opp: schema.opportunities })
    .from(schema.applications)
    .innerJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
    .where(and(eq(schema.applications.id, applicationId), eq(schema.applications.userId, userId)));
  if (!row) throw new HttpError(404, "Application not found.");
  return row;
}

async function setState(applicationId: string, state: ApplicationState, extra: Partial<typeof schema.applications.$inferInsert> = {}) {
  const db = await getDb();
  await db.update(schema.applications).set({ state, updatedAt: new Date(), ...extra }).where(eq(schema.applications.id, applicationId));
}

function stepLogger(applicationId: string): StepLogger {
  return async (kind, message, shot) => {
    const db = await getDb();
    const [{ seq }] = await db
      .select({ seq: max(schema.runSteps.seq) })
      .from(schema.runSteps)
      .where(eq(schema.runSteps.applicationId, applicationId));
    await db.insert(schema.runSteps).values({ applicationId, seq: (seq ?? 0) + 1, kind, message: message.slice(0, 1000), screenshot: shot ?? null });
  };
}

async function setMatchStatus(userId: string, opportunityId: string, status: "applying" | "submitted") {
  const db = await getDb();
  await db
    .update(schema.matches)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.matches.userId, userId), eq(schema.matches.opportunityId, opportunityId)));
}

// ---------------- 1. Draft + verify ----------------

export async function startApplication(userId: string, opportunityId: string) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.opportunityId, opportunityId)))
    .orderBy(desc(schema.applications.createdAt))
    .limit(1);
  if (existing && !["failed", "cancelled"].includes(existing.state)) return existing.id;
  const { dailyApplications } = await requireFeature(userId, "applyAgent");

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), gte(schema.applications.createdAt, since)));
  if (Number(count) >= dailyApplications) {
    throw new HttpError(429, `You've started ${dailyApplications} applications today. Quality beats volume, so come back tomorrow.`);
  }

  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  if (!opp) throw new HttpError(404, "Opportunity not found.");
  if (!profile?.parsed || !profile.resumeText) throw new HttpError(400, "Upload your resume first.");

  const [app] = await db.insert(schema.applications).values({ userId, opportunityId, state: "drafting" }).returning();
  await setMatchStatus(userId, opportunityId, "applying");
  const log = stepLogger(app.id);

  try {
    await log("system", "Tailoring your materials from your resume…");
    const drafted = await tailor({ userId, profile: profile.parsed, resumeText: profile.resumeText, opp });
    await log("system", "Checking every claim against your resume…");
    const report = await verify({ userId, tailored: drafted.value, resumeText: profile.resumeText });
    const flagged = report.value.claims.filter((c) => c.status === "unsupported").length;
    await log("system", flagged ? `Verifier flagged ${flagged} claim${flagged > 1 ? "s" : ""} not backed by your resume.` : "Every claim is backed by your resume.");
    await setState(app.id, "review_materials", { tailored: drafted.value, verifier: report.value });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log("error", message);
    await setState(app.id, "failed", { error: message });
  }
  return app.id;
}

// ---------------- 2. User edits / accepts materials ----------------

export async function saveMaterials(userId: string, applicationId: string, tailored: Tailored) {
  const { app } = await loadOwned(userId, applicationId);
  if (app.state !== "review_materials") throw new HttpError(409, "Materials can only be edited before the agent starts.");
  await requireFeature(userId, "applyAgent");
  const db = await getDb();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  // Edits are re-verified: the gate applies to the user's wording too.
  const report = await verify({ userId, tailored, resumeText: profile?.resumeText ?? "" });
  await setState(applicationId, "review_materials", { tailored, verifier: report.value, acceptedClaims: [] });
  return report.value;
}

export async function approveMaterials(userId: string, applicationId: string, acceptedClaims: string[]) {
  const { app, opp } = await loadOwned(userId, applicationId);
  if (app.state !== "review_materials" || !app.tailored || !app.verifier) throw new HttpError(409, "Nothing to approve.");
  const unsupported = app.verifier.claims.filter((c) => c.status === "unsupported").map((c) => c.claim);
  const unaccepted = unsupported.filter((c) => !acceptedClaims.includes(c));
  if (unaccepted.length) {
    throw new HttpError(422, `Fix or explicitly accept ${unaccepted.length} unsupported claim${unaccepted.length > 1 ? "s" : ""} first.`);
  }
  const log = stepLogger(applicationId);
  await log("system", acceptedClaims.length ? `You accepted ${acceptedClaims.length} flagged claim(s) as true.` : "Materials approved.");
  if (!opp.applyUrl || !AGENT_ATS.has(opp.ats ?? "")) {
    await setState(applicationId, "handoff", { acceptedClaims, error: null });
    await log("system", "This site isn't supported by the agent yet, so your answers are ready to copy and the form is one click away.");
    return { state: "handoff" as const };
  }
  await setState(applicationId, "queued", { acceptedClaims, error: null });
  await dispatch(applicationId, "fill");
  return { state: "queued" as const };
}

// ---------------- 3. Agent fill (in-process or remote worker) ----------------

export async function dispatch(applicationId: string, phase: "fill" | "submit") {
  if (env.APPLY_WORKER_URL) {
    const res = await fetch(`${env.APPLY_WORKER_URL.replace(/\/$/, "")}/run`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.APPLY_WORKER_SECRET ?? ""}` },
      body: JSON.stringify({ applicationId, phase }),
    });
    if (!res.ok) throw new HttpError(502, `Apply worker rejected the job (${res.status}).`);
    return;
  }
  // Local/dev: run in the background of this long-lived Node process.
  void runPhase(applicationId, phase).catch((err) => console.error(`[apply] ${phase} crashed:`, err));
}

const resumeFile = (applicationId: string) => path.join(os.tmpdir(), "opurnos", `${applicationId}.pdf`);

function writeResume(applicationId: string, base64: string | null): string | null {
  if (!base64) return null;
  const file = resumeFile(applicationId);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(base64, "base64"));
  return file;
}

export async function runPhase(applicationId: string, phase: "fill" | "submit") {
  const db = await getDb();
  const [row] = await db
    .select({ app: schema.applications, opp: schema.opportunities, profile: schema.profiles, user: schema.users })
    .from(schema.applications)
    .innerJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
    .innerJoin(schema.profiles, eq(schema.applications.userId, schema.profiles.userId))
    .innerJoin(schema.users, eq(schema.applications.userId, schema.users.id))
    .where(eq(schema.applications.id, applicationId));
  if (!row) return;
  const log = stepLogger(applicationId);
  return phase === "fill" ? fill(row, log) : submit(row, log);
}

type Row = {
  app: typeof schema.applications.$inferSelect;
  opp: typeof schema.opportunities.$inferSelect;
  profile: typeof schema.profiles.$inferSelect;
  user: typeof schema.users.$inferSelect;
};

async function fill(row: Row, log: StepLogger) {
  const { app, opp, profile, user } = row;
  if (app.state !== "queued" || !app.tailored || !profile.parsed) return;
  await setState(app.id, "filling");
  const resumePath = writeResume(app.id, profile.resumeFile);
  let launched: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  let kept = false;
  try {
    launched = await launchBrowser();
    const { page } = launched;
    await log("system", `Opening ${new URL(opp.applyUrl!).hostname} in an isolated browser…`);
    await page.goto(opp.applyUrl!, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1500);
    await log("action", "Loaded the application form.", await screenshot(page));

    const outcome = await runFillAgent({
      page,
      userId: app.userId,
      applicant: { profile: profile.parsed, email: user.email, tailored: app.tailored },
      resumePath,
      log,
    });
    const fields = (await snapshotFields(page))
      .filter((f) => ["input", "textarea", "select"].includes(f.tag) && !["submit", "button", "hidden"].includes(f.type) && f.label)
      .map((f) => ({ label: `${f.label}${f.required && (!f.value || f.value === "false") ? " (required, empty)" : ""}`, value: f.type === "file" ? (f.value ? "Resume attached" : "") : f.value }));
    await log("system", outcome.reason, await screenshot(page));

    if (outcome.status === "review") {
      // The browser reads the resume again on submit, so the file lives as long as the session.
      keepSession(app.id, launched.browser, page, () => rmSync(resumeFile(app.id), { force: true }));
      launched = null; // ownership moved to the live-session registry
      kept = true;
      await setState(app.id, "awaiting_approval", { fields });
    } else {
      await setState(app.id, "handoff", { fields, error: outcome.reason });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    await log("error", message);
    await setState(app.id, "handoff", { error: `The agent hit a problem (${message}). Your answers are ready to paste.` });
  } finally {
    if (launched) await launched.browser.close().catch(() => undefined);
    if (!kept && resumePath) rmSync(resumePath, { force: true });
  }
}

async function submit(row: Row, log: StepLogger) {
  const { app } = row;
  if (app.state !== "submitting") return;
  const page = getSession(app.id);
  if (!page) {
    await setState(app.id, "handoff", { error: "The browser session expired before approval. Open the form to submit it yourself." });
    await log("error", "Browser session expired (20 minutes).");
    return;
  }
  try {
    const result = await submitForm(page);
    await log(result.ok ? "action" : "error", result.message, await screenshot(page));
    if (result.ok) {
      await setState(app.id, "submitted", { submittedAt: new Date() });
      await setMatchStatus(app.userId, app.opportunityId, "submitted");
    } else {
      await setState(app.id, "handoff", { error: result.message });
    }
  } finally {
    closeSession(app.id);
  }
}

// ---------------- 4. Approval gate ----------------

export async function approveSubmit(userId: string, applicationId: string) {
  const { app } = await loadOwned(userId, applicationId);
  if (app.state !== "awaiting_approval") throw new HttpError(409, "This application isn't waiting for approval.");
  await stepLogger(applicationId)("system", "You approved the submission.");
  await setState(applicationId, "submitting");
  await dispatch(applicationId, "submit");
}

export async function markSubmittedManually(userId: string, applicationId: string) {
  const { app } = await loadOwned(userId, applicationId);
  if (!["handoff", "review_materials", "awaiting_approval"].includes(app.state)) throw new HttpError(409, "Can't mark this as submitted.");
  closeSession(applicationId);
  await setState(applicationId, "submitted", { submittedAt: new Date() });
  await setMatchStatus(userId, app.opportunityId, "submitted");
}

export async function cancelApplication(userId: string, applicationId: string) {
  await loadOwned(userId, applicationId);
  closeSession(applicationId);
  await setState(applicationId, "cancelled");
}

export async function getApplicationView(userId: string, applicationId: string, afterSeq = 0) {
  const { app, opp } = await loadOwned(userId, applicationId);
  const db = await getDb();
  const steps = await db
    .select()
    .from(schema.runSteps)
    .where(and(eq(schema.runSteps.applicationId, applicationId), gte(schema.runSteps.seq, afterSeq + 1)))
    .orderBy(schema.runSteps.seq);
  return { app, opp, steps, agentSupported: AGENT_ATS.has(opp.ats ?? "") };
}
