import { describe, expect, it } from "vitest";
import { keywordFit, preference, profileKeywords, scoreMatch, urgency, WEIGHTS } from "@/lib/ranking";
import { makePrefs, makeProfile, NOW } from "./fixtures";

const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("WEIGHTS", () => {
  it("sums to 1 so scores stay in 0..100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe("urgency", () => {
  it("treats rolling deadlines as moderate", () => expect(urgency(null, NOW)).toBe(0.4));
  it("is zero once closed", () => expect(urgency(days(-1), NOW)).toBe(0));
  it("is maximal within a week", () => expect(urgency(days(3), NOW)).toBe(1));
  it("floors at 0.2 for far-off deadlines", () => expect(urgency(days(200), NOW)).toBe(0.2));
  it("decreases monotonically between 7 and 90 days", () => {
    expect(urgency(days(20), NOW)).toBeGreaterThan(urgency(days(60), NOW));
  });
});

describe("profileKeywords", () => {
  it("puts preferred roles first and dedupes tokens", () => {
    const kw = profileKeywords(makeProfile(), makePrefs({ roles: ["ml research"] }));
    expect(kw[0]).toBe("ml");
    expect(kw).toContain("pytorch");
    expect(new Set(kw).size).toBe(kw.length);
  });

  it("drops generic role words and keeps fields like machine learning whole", () => {
    const kw = profileKeywords(makeProfile(), makePrefs({ roles: ["Machine Learning Intern", "Software Engineer"] }));
    expect(kw.slice(0, 1)).toEqual(["ml"]);
    expect(kw).not.toContain("intern");
    expect(kw).not.toContain("learning");
    expect(kw).not.toContain("software");
  });

  it("caps the list at 80 keywords", () => {
    const skills = Array.from({ length: 200 }, (_, i) => `skill${i}`);
    expect(profileKeywords(makeProfile({ skills }), makePrefs())).toHaveLength(80);
  });
});

describe("keywordFit", () => {
  it("returns a neutral prior without keywords", () => expect(keywordFit([], "x", "y")).toBe(0.3));

  it("scores title hits above body-only hits", () => {
    const kw = ["python", "pytorch", "robotics", "react", "rust", "go", "kotlin", "swift", "java", "scala", "haskell", "elixir", "ruby", "php", "perl", "lua", "dart", "julia", "matlab", "fortran"];
    const title = keywordFit(kw, "Python PyTorch intern", "");
    const body = keywordFit(kw, "Intern", "python pytorch");
    expect(title).toBeGreaterThan(body);
  });

  it("is zero for unrelated listings and capped at 1", () => {
    expect(keywordFit(["python"], "Chef", "kitchen")).toBe(0);
    expect(keywordFit(["python"], "Python", "python")).toBe(1);
  });
});

describe("preference", () => {
  it("is neutral without history", () => expect(preference({ byType: {}, byOrg: {} }, "job", "Acme")).toBe(0.5));

  it("rises with saves and falls with dismissals, staying in [0,1]", () => {
    const liked = preference({ byType: { hackathon: 10 }, byOrg: { acme: 5 } }, "hackathon", "Acme");
    const disliked = preference({ byType: { hackathon: -10 }, byOrg: { acme: -5 } }, "hackathon", "ACME");
    expect(liked).toBeGreaterThan(0.9);
    expect(disliked).toBeLessThan(0.1);
    expect(disliked).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreMatch", () => {
  const base = { fit: 0.9, verdict: "eligible" as const, deadline: days(5), value: 0.8, preference: 0.5, now: NOW };

  it("produces a high score for a strong, eligible, urgent match", () => {
    const { score, breakdown } = scoreMatch(base);
    expect(score).toBeGreaterThan(80);
    expect(breakdown.eligibility).toBe(1);
  });

  it("caps ineligible matches at 25", () => {
    expect(scoreMatch({ ...base, verdict: "ineligible" }).score).toBeLessThanOrEqual(25);
  });

  it("caps closed opportunities at 25", () => {
    expect(scoreMatch({ ...base, deadline: days(-2) }).score).toBeLessThanOrEqual(25);
  });

  it("clamps out-of-range and non-finite inputs", () => {
    const { breakdown } = scoreMatch({ ...base, fit: 4, value: Number.NaN, preference: -1 });
    expect(breakdown).toMatchObject({ fit: 1, value: 0, preference: 0 });
  });

  it("orders verdicts eligible > likely > stretch", () => {
    const s = (verdict: "eligible" | "likely" | "stretch") => scoreMatch({ ...base, verdict }).score;
    expect(s("eligible")).toBeGreaterThan(s("likely"));
    expect(s("likely")).toBeGreaterThan(s("stretch"));
  });
});
