import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-account-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.MODEL_API_KEY = "";
process.env.RESEND_API_KEY = "";
process.env.APP_URL = "http://localhost:3000";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

import { HttpError } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { safeNext } from "@/lib/auth-redirect";

describe("password rules", () => {
  it("rejects short, repetitive, and email-derived passwords", () => {
    expect(passwordProblem("short")).toMatch(/10/);
    expect(passwordProblem("aaaaaaaaaa")).toMatch(/easy/);
    expect(passwordProblem("student-student", "student@university.edu")).toMatch(/email/);
    expect(passwordProblem("correct horse battery")).toBeNull();
  });

  it("round-trips a hash and rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong horse battery", stored)).toBe(false);
    expect(await verifyPassword("correct horse battery", "not-a-hash")).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps in-app paths and drops off-site ones", () => {
    expect(safeNext("/radar?x=1")).toBe("/radar?x=1");
    expect(safeNext("https://evil.test")).toBe("/radar");
    expect(safeNext("//evil.test")).toBe("/radar");
    expect(safeNext("/\\evil")).toBe("/radar");
    expect(safeNext(undefined, "")).toBe("");
  });
});

describe("account flows", () => {
  let account: typeof import("@/lib/account");
  const stamp = crypto.randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${stamp}@university.edu`;
  // A fresh address each run, so the shared dev database's rate-limit counters don't carry over.
  const address = (n: number) => `203.0.113.${stamp.slice(0, 2)}.${n}`;

  beforeAll(async () => {
    account = await import("@/lib/account");
  });

  it("signs up, rejects a duplicate, and signs in", async () => {
    const created = await account.signUp({ name: "Ada", email: email("Ada"), password: "correct horse battery" }, address(1));
    expect(created.userId).toBeTruthy();
    expect(created.devLink).toContain("/api/auth/verify-email");
    await expect(account.signUp({ email: email("ada"), password: "another good password" }, address(1))).rejects.toMatchObject({ status: 409 });
    await expect(account.signIn({ email: email("ada"), password: "nope-nope-nope" }, address(2))).rejects.toBeInstanceOf(HttpError);
    await expect(account.signIn({ email: email("ada"), password: "correct horse battery" }, address(2))).resolves.toMatchObject({ userId: created.userId });
  });

  it("confirms an email once, then resets the password", async () => {
    const who = email("reset");
    const created = await account.signUp({ email: who, password: "correct horse battery" }, address(3));
    const token = new URL(created.devLink!).searchParams.get("t")!;
    expect(await account.verifyEmail(token)).toBe(true);
    expect(await account.verifyEmail(token)).toBe(false);
    expect((await account.accountSummary(created.userId))?.emailVerified).toBe(true);

    const reset = await account.requestPasswordReset(who, address(3));
    expect(await account.requestPasswordReset(email("nobody"), address(4))).toEqual({});
    const resetToken = new URL(reset.devLink!).searchParams.get("t")!;
    const again = await account.resetPassword({ token: resetToken, password: "a different passphrase" });
    expect(again.userId).toBe(created.userId);
    await expect(account.signIn({ email: who, password: "a different passphrase" }, address(5))).resolves.toMatchObject({ userId: created.userId });
    await expect(account.resetPassword({ token: resetToken, password: "a different passphrase" })).rejects.toMatchObject({ status: 400 });
  });

  it("links a verified Google account onto an existing email", async () => {
    const who = email("google");
    const created = await account.signUp({ email: who, password: "correct horse battery" }, address(6));
    const linked = await account.userForGoogle({ sub: `google-sub-${stamp}`, email: who, emailVerified: true, name: "Grace" });
    expect(linked.id).toBe(created.userId);
    expect((await account.accountSummary(created.userId))?.hasGoogle).toBe(true);
    await expect(account.userForGoogle({ sub: `google-sub-${stamp}-2`, email: email("new"), emailVerified: false })).rejects.toMatchObject({ status: 400 });
  });
});
