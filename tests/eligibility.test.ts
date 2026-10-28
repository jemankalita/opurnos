import { describe, expect, it } from "vitest";
import { checkRules, isStudent, reconcileVerdict } from "@/lib/eligibility";
import { makePrefs, makeProfile, makeRules, NOW } from "./fixtures";

const future = new Date("2026-12-01T00:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");

describe("isStudent", () => {
  it("is true when graduation is this year or later", () => expect(isStudent(makeProfile(), NOW)).toBe(true));
  it("is false for graduates", () => {
    const grad = makeProfile({ education: [{ ...makeProfile().education[0], gradYear: 2022 }] });
    expect(isStudent(grad, NOW)).toBe(false);
  });
  it("is unknown without a graduation year", () => expect(isStudent(makeProfile({ education: [] }), NOW)).toBeNull());
});

describe("checkRules", () => {
  it("is eligible when there are no rules and the listing is open", () => {
    const r = checkRules(makeProfile(), makePrefs(), makeRules(), future, NOW);
    expect(r.verdict).toBe("eligible");
    expect(r.evidence).toHaveLength(1);
  });

  it("marks closed listings ineligible", () => {
    expect(checkRules(makeProfile(), makePrefs(), makeRules(), past, NOW).verdict).toBe("ineligible");
  });

  it("checks degree level", () => {
    const ok = checkRules(makeProfile(), makePrefs(), makeRules({ degreeLevels: ["bachelors", "masters"] }), null, NOW);
    const bad = checkRules(makeProfile(), makePrefs(), makeRules({ degreeLevels: ["phd"] }), null, NOW);
    expect(ok.verdict).toBe("eligible");
    expect(bad.verdict).toBe("ineligible");
    expect(bad.evidence[0].profileFact).toContain("IIT Example");
  });

  it("checks the graduation window", () => {
    expect(checkRules(makeProfile(), makePrefs(), makeRules({ gradYearMin: 2027, gradYearMax: 2029 }), null, NOW).verdict).toBe("eligible");
    expect(checkRules(makeProfile(), makePrefs(), makeRules({ gradYearMax: 2027 }), null, NOW).verdict).toBe("ineligible");
  });

  it("returns likely when a requirement can't be checked", () => {
    const r = checkRules(makeProfile({ education: [] }), makePrefs(), makeRules({ gradYearMin: 2027 }), null, NOW);
    expect(r.verdict).toBe("likely");
    expect(r.evidence[0].status).toBe("unknown");
  });

  it("matches country via residence or work authorization, case-insensitively", () => {
    expect(checkRules(makeProfile(), makePrefs(), makeRules({ countries: ["in"] }), null, NOW).verdict).toBe("eligible");
    expect(checkRules(makeProfile(), makePrefs(), makeRules({ countries: ["US"] }), null, NOW).verdict).toBe("ineligible");
    expect(checkRules(makeProfile(), makePrefs({ workAuth: ["US"] }), makeRules({ countries: ["US"] }), null, NOW).verdict).toBe("eligible");
  });

  it("flags missing sponsorship only for people who need it", () => {
    const rules = makeRules({ sponsorship: "not_offered" });
    expect(checkRules(makeProfile(), makePrefs({ needsSponsorship: true }), rules, null, NOW).verdict).toBe("ineligible");
    expect(checkRules(makeProfile(), makePrefs(), rules, null, NOW).verdict).toBe("eligible");
  });

  it("enforces students-only programs", () => {
    const grad = makeProfile({ education: [{ ...makeProfile().education[0], gradYear: 2020 }] });
    expect(checkRules(grad, makePrefs(), makeRules({ studentsOnly: true }), null, NOW).verdict).toBe("ineligible");
  });
});

describe("reconcileVerdict", () => {
  it("lets a hard unmet rule override the model", () => {
    expect(reconcileVerdict("eligible", { verdict: "ineligible", evidence: [] })).toBe("ineligible");
  });
  it("otherwise keeps the model's nuance", () => {
    expect(reconcileVerdict("stretch", { verdict: "eligible", evidence: [] })).toBe("stretch");
  });
});
