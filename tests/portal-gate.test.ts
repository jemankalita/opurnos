/**
 * Passcode gate against a real (embedded) Postgres: three tries, then a server-side lockout
 * that a page refresh or a new browser can't clear.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-gate-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.PORTAL_PASSCODE = "BARNALI";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

type Gate = typeof import("@/lib/portal/gate");
type GateToken = typeof import("@/lib/portal/gate-token");
let gate: Gate;
let token: GateToken;

beforeAll(async () => {
  gate = await import("@/lib/portal/gate");
  token = await import("@/lib/portal/gate-token");
}, 60_000);

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

const NOW = new Date("2026-11-06T10:00:00Z");
const minutesLater = (m: number) => new Date(NOW.getTime() + m * 60_000);

describe("passcodeMatches", () => {
  it("accepts the passcode with stray spaces or a phone's auto-capitalisation", () => {
    expect(gate.passcodeMatches("BARNALI", "BARNALI")).toBe(true);
    expect(gate.passcodeMatches("  barnali ", "BARNALI")).toBe(true);
    expect(gate.passcodeMatches("Barnali", "BARNALI")).toBe(true);
  });

  it("rejects anything else, including a prefix and an empty string", () => {
    expect(gate.passcodeMatches("BARNAL", "BARNALI")).toBe(false);
    expect(gate.passcodeMatches("", "BARNALI")).toBe(false);
  });
});

describe("attemptPasscode", () => {
  it("lets the right passcode in on the first try", async () => {
    expect(await gate.attemptPasscode("first-try", "BARNALI", NOW)).toEqual({ status: "ok" });
  });

  it("lets the right passcode in on the third try", async () => {
    expect(await gate.attemptPasscode("third-try", "nope", NOW)).toEqual({ status: "wrong", triesLeft: 2 });
    expect(await gate.attemptPasscode("third-try", "nope", NOW)).toEqual({ status: "wrong", triesLeft: 1 });
    expect(await gate.attemptPasscode("third-try", "BARNALI", NOW)).toEqual({ status: "ok" });
  });

  it("locks after the third wrong try and refuses even the right passcode while locked", async () => {
    await gate.attemptPasscode("locked", "a", NOW);
    await gate.attemptPasscode("locked", "b", NOW);
    const third = await gate.attemptPasscode("locked", "c", NOW);
    expect(third.status).toBe("locked");
    expect((await gate.attemptPasscode("locked", "BARNALI", minutesLater(1))).status).toBe("locked");
  });

  it("gives three fresh tries once the lock has expired", async () => {
    for (const guess of ["a", "b", "c"]) await gate.attemptPasscode("expired", guess, NOW);
    const after = minutesLater(gate.LOCK_MINUTES + 1);
    expect(await gate.attemptPasscode("expired", "nope", after)).toEqual({ status: "wrong", triesLeft: 2 });
  });

  it("clears the count after a success, so an earlier typo doesn't carry over", async () => {
    await gate.attemptPasscode("reset", "nope", NOW);
    await gate.attemptPasscode("reset", "BARNALI", NOW);
    expect(await gate.gateState("reset", NOW)).toEqual({ status: "open", triesLeft: gate.MAX_TRIES });
  });

  it("keeps each visitor's count separate", async () => {
    for (const guess of ["a", "b", "c"]) await gate.attemptPasscode("visitor-a", guess, NOW);
    expect(await gate.attemptPasscode("visitor-b", "BARNALI", NOW)).toEqual({ status: "ok" });
  });

  it("fails closed when no passcode is configured", async () => {
    expect(await gate.attemptPasscode("unset", "anything", NOW, "")).toEqual({ status: "unconfigured" });
  });
});

describe("gateState", () => {
  it("reports remaining tries so a refresh can't reset the counter", async () => {
    await gate.attemptPasscode("state", "nope", NOW);
    expect(await gate.gateState("state", NOW)).toEqual({ status: "open", triesLeft: 2 });
  });

  it("reports when a locked visitor can try again", async () => {
    for (const guess of ["a", "b", "c"]) await gate.attemptPasscode("state-locked", guess, NOW);
    const state = await gate.gateState("state-locked", minutesLater(1));
    expect(state).toEqual({ status: "locked", retryAt: minutesLater(gate.LOCK_MINUTES).toISOString() });
  });
});

describe("clientAddress", () => {
  it("prefers x-real-ip, which the hosting proxy sets", () => {
    expect(gate.clientAddress(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
  });

  it("uses the last forwarded hop, so a client can't pick its own key by spoofing the header", () => {
    const spoofed = (fake: string) => new Headers({ "x-forwarded-for": `${fake}, 198.51.100.7` });
    expect(gate.clientAddress(spoofed("1.1.1.1"))).toBe("198.51.100.7");
    expect(gate.visitorKey(spoofed("1.1.1.1"))).toBe(gate.visitorKey(spoofed("2.2.2.2")));
  });

  it("falls back to a fixed key when there are no address headers", () => {
    expect(gate.clientAddress(new Headers())).toBe("local");
  });
});

describe("pruneAttempts", () => {
  it("removes old unlocked rows and keeps recent or still-locked ones", async () => {
    const old = new Date(NOW.getTime() - 2 * 24 * 60 * 60_000);
    await gate.attemptPasscode("prune-old", "nope", old);
    for (const guess of ["a", "b", "c"]) await gate.attemptPasscode("prune-locked", guess, NOW);
    await gate.attemptPasscode("prune-recent", "nope", NOW);

    await gate.pruneAttempts(minutesLater(1));

    expect(await gate.gateState("prune-old", minutesLater(1))).toEqual({ status: "open", triesLeft: gate.MAX_TRIES });
    expect((await gate.gateState("prune-locked", minutesLater(1))).status).toBe("locked");
    expect(await gate.gateState("prune-recent", minutesLater(1))).toEqual({ status: "open", triesLeft: gate.MAX_TRIES - 1 });
  });
});

describe("portal token", () => {
  it("verifies a token it signed", async () => {
    expect(await token.isPortalToken(await token.signPortalToken())).toBe(true);
  });

  it("rejects a forged, empty or missing token", async () => {
    expect(await token.isPortalToken("not-a-token")).toBe(false);
    expect(await token.isPortalToken("")).toBe(false);
    expect(await token.isPortalToken(undefined)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps a local path", () => {
    expect(token.safeNextPath("/radar?tab=new")).toBe("/radar?tab=new");
  });

  it("falls back to the portal for anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", String.raw`/\evil.example`, "", undefined]) {
      expect(token.safeNextPath(bad)).toBe("/portal");
    }
  });
});
