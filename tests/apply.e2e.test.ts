/**
 * Real-browser E2E of the apply agent: a local job-application form, system Chrome
 * (headless), demo mode. Proves the agent fills standard fields, refuses to submit on
 * its own, pauses for approval, and only submits after approveSubmit().
 * Skips automatically when Google Chrome isn't installed.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makePrefs, makeProfile } from "./fixtures";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/opt/google/chrome/chrome",
];
const hasChrome = Boolean(process.env.BROWSER_EXECUTABLE) || CHROME_PATHS.some((p) => existsSync(p));

const FORM = `<!doctype html><html><body>
<h1>Software Engineer Intern</h1>
<form method="post" action="/submit" enctype="multipart/form-data">
  <label for="fn">First Name *</label><input id="fn" name="first" required>
  <label for="ln">Last Name *</label><input id="ln" name="last" required>
  <label for="em">Email *</label><input id="em" name="email" type="email" required>
  <label for="ph">Phone</label><input id="ph" name="phone">
  <label for="li">LinkedIn Profile</label><input id="li" name="linkedin">
  <label for="cv">Resume/CV</label><input id="cv" name="resume" type="file">
  <label for="cl">Cover Letter</label><textarea id="cl" name="cover"></textarea>
  <label for="g">Gender</label><select id="g" name="gender"><option>Select...</option><option>Male</option><option>Female</option><option>Decline to self-identify</option></select>
  <label for="auth">Are you authorized to work here? *</label><select id="auth" name="auth"><option value="">Select...</option><option>Yes</option><option>No</option></select>
  <button type="submit">Submit application</button>
</form></body></html>`;

const posts: string[] = [];
const server: Server = createServer((req, res) => {
  if (req.method === "POST") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      posts.push(raw);
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><h1>Thank you for applying!</h1><p>Your application has been received.</p></body></html>");
    });
    return;
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(FORM);
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const formUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/jobs/1`;

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-e2e-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.MODEL_API_KEY = "";
process.env.APPLY_WORKER_URL = "";
process.env.BROWSER_HEADLESS = "true";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

const TINY_PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");

async function waitForState(get: () => Promise<string>, want: string[], timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const state = await get();
    if (want.includes(state) || Date.now() > end) return state;
    await new Promise((r) => setTimeout(r, 250));
  }
}

afterAll(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe.skipIf(!hasChrome)("apply agent in a real browser", () => {
  let service: typeof import("@/lib/apply/service");
  let userId: string;
  let appId: string;

  beforeAll(async () => {
    const { getDb, schema } = await import("@/lib/db");
    const { findOrCreateUser } = await import("@/lib/auth");
    const { upsertOpportunities } = await import("@/lib/ingest");
    service = await import("@/lib/apply/service");
    const db = await getDb();
    userId = (await findOrCreateUser("e2e@example.com")).id;
    const profile = makeProfile();
    await db.insert(schema.profiles).values({
      userId,
      parsed: profile,
      resumeText: [profile.headline, ...profile.experience.flatMap((e) => e.bullets)].join(". "),
      resumeFile: TINY_PDF,
      resumeFileName: "asha.pdf",
      prefs: makePrefs(),
      onboarded: true,
    });
    await upsertOpportunities("greenhouse:test", [
      {
        externalId: "1",
        url: formUrl,
        applyUrl: formUrl,
        ats: "greenhouse",
        type: "internship",
        title: "Software Engineer Intern",
        org: "Test Co",
        locations: ["Remote"],
        remote: true,
        deadline: null,
        tags: [],
        description: "Python retrieval latency",
      },
    ]);
    const [opp] = await db.select().from(schema.opportunities);
    appId = await service.startApplication(userId, opp.id);
  }, 120_000);

  const state = async () => (await service.getApplicationView(userId, appId)).app.state;

  it("fills standard fields, then stops at the approval gate without submitting", async () => {
    const view = await service.getApplicationView(userId, appId);
    const unsupported = view.app.verifier!.claims.filter((c) => c.status === "unsupported").map((c) => c.claim);
    expect((await service.approveMaterials(userId, appId, unsupported)).state).toBe("queued");

    expect(await waitForState(state, ["awaiting_approval", "handoff", "failed"])).toBe("awaiting_approval");
    const after = await service.getApplicationView(userId, appId);
    const field = (label: RegExp) => after.app.fields.find((f) => label.test(f.label));
    expect(field(/^First Name/)?.value).toBe("Asha");
    expect(field(/^Last Name/)?.value).toBe("Rao");
    expect(field(/^Email/)?.value).toBe("e2e@example.com");
    expect(field(/^LinkedIn/)?.value).toBe("https://linkedin.com/in/asha");
    expect(field(/^Resume/)?.value).toBe("Resume attached");
    expect(field(/^Cover Letter/)?.value).toContain("Test Co");
    expect(field(/^Gender/)?.value).toBe("Decline to self-identify");
    // The agent must not guess legal answers: work authorization stays empty and is flagged.
    expect(field(/authorized/)?.label).toContain("(required, empty)");
    expect(after.steps.some((s) => s.screenshot)).toBe(true);
    expect(posts).toHaveLength(0);
  }, 90_000);

  it("submits only after the user approves, and records the confirmation", async () => {
    await service.approveSubmit(userId, appId);
    expect(await waitForState(state, ["submitted", "handoff", "failed"])).toBe("submitted");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain("Asha");
    const view = await service.getApplicationView(userId, appId);
    expect(view.steps.at(-1)?.message).toMatch(/confirmed/);
  }, 90_000);
});

describe.skipIf(!hasChrome)("submit guard", () => {
  it("refuses agent clicks on submit controls", async () => {
    const { launchBrowser, snapshotFields, act } = await import("@/lib/apply/browser");
    const { browser, page } = await launchBrowser();
    try {
      await page.goto(formUrl);
      const fields = await snapshotFields(page);
      const submit = fields.find((f) => f.type === "submit")!;
      const before = posts.length;
      const result = await act(page, { kind: "click", id: submit.id }, { allowSubmit: false, resumePath: null });
      expect(result).toMatch(/^BLOCKED/);
      const box = await page.locator(`[data-op-id="${submit.id}"]`).boundingBox();
      const xy = await act(page, { kind: "click_xy", x: box!.x + 5, y: box!.y + 5 }, { allowSubmit: false, resumePath: null });
      expect(xy).toMatch(/^BLOCKED/);
      expect(posts.length).toBe(before);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
