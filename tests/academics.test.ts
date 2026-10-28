import { describe, expect, it } from "vitest";
import { academicEvidence, branchCodes, extractAcademicRules, meetsCutoff, parseMarks } from "@/lib/academics";
import { extractRulesHeuristic } from "@/lib/ai/heuristics";
import { checkRules } from "@/lib/eligibility";
import { makePrefs, makeProfile, makeRules } from "./fixtures";

const NOW = new Date("2026-10-28T00:00:00Z");

describe("parseMarks", () => {
  it.each([
    ["8.2/10", { cgpa: 8.2 }],
    ["8.2 CGPA", { cgpa: 8.2 }],
    ["CPI: 7.9", { cgpa: 7.9 }],
    ["85%", { percent: 85 }],
    ["91.4 %", { percent: 91.4 }],
    ["450/500", {}],
    ["3.7/4.0", {}],
    [null, {}],
  ])("%s", (raw, expected) => expect(parseMarks(raw)).toEqual(expected));
});

describe("meetsCutoff", () => {
  it("compares on the same scale", () => {
    expect(meetsCutoff({ cgpa: 7.5 }, { minCgpa: 7, minPercent: null })).toBe("met");
    expect(meetsCutoff({ percent: 58 }, { minCgpa: null, minPercent: 60 })).toBe("unmet");
  });
  it("accepts either scale when both are allowed", () => {
    expect(meetsCutoff({ cgpa: 6.2, percent: 58 }, { minCgpa: 6, minPercent: 60 })).toBe("met");
  });
  it("converts across scales only when both conversions agree", () => {
    expect(meetsCutoff({ cgpa: 8 }, { minCgpa: null, minPercent: 60 })).toBe("met"); // 72.5–76%
    expect(meetsCutoff({ cgpa: 5 }, { minCgpa: null, minPercent: 60 })).toBe("unmet"); // 42.5–47.5%
    expect(meetsCutoff({ cgpa: 6.5 }, { minCgpa: null, minPercent: 60 })).toBe("unknown"); // 57.5–61.75%
    expect(meetsCutoff({}, { minCgpa: 7, minPercent: null })).toBe("unknown");
  });
});

describe("branchCodes", () => {
  it.each([
    ["B.Tech Computer Science and Engineering", ["CSE"]],
    ["B.E. Electronics and Communication", ["ECE"]],
    ["Electrical and Electronics Engineering", ["EEE"]],
    ["B.Tech IT", ["IT"]],
    ["Mechanical Engineering", ["ME"]],
  ])("%s", (text, codes) => expect(branchCodes(text)).toEqual(codes));

  it("expands circuit branches", () => {
    expect(branchCodes("Eligible branches: circuit branches")).toEqual(expect.arrayContaining(["CSE", "IT", "ECE", "EEE"]));
  });
});

describe("extractAcademicRules (Indian drive wording)", () => {
  const drive = `Eligibility Criteria:
    - B.E/B.Tech (CSE, IT, ECE) 2026 & 2027 batch
    - Minimum 60% throughout in 10th, 12th and graduation
    - No active backlogs at the time of joining`;

  it("reads batch, marks throughout, backlogs and branches", () => {
    expect(extractAcademicRules(drive)).toEqual({
      minPercent: 60,
      marksThroughout: true,
      minCgpa: null,
      maxBacklogs: 0,
      branches: ["CSE", "IT", "ECE"],
      gradYearMin: 2026,
      gradYearMax: 2027,
    });
  });

  it("reads CGPA cutoffs, backlog limits and passout years", () => {
    const r = extractAcademicRules("Open to 2027 passouts with CGPA of 7.5 and above. Maximum 1 active backlog allowed. All branches eligible.");
    expect(r).toMatchObject({ minCgpa: 7.5, maxBacklogs: 1, branches: [], gradYearMin: 2027, gradYearMax: 2027 });
  });

  it("reads named branches and leaves any-branch drives open", () => {
    expect(extractAcademicRules("Eligible branches: circuit branches only").branches).toEqual(expect.arrayContaining(["CSE", "ECE", "EEE"]));
    expect(extractAcademicRules("B.Tech in any discipline, 2026 batch").branches).toEqual([]);
  });

  it("ignores percentages that aren't marks", () => {
    expect(extractAcademicRules("Up to 30% hike on current CTC. 50% off on courses.").minPercent).toBeNull();
  });

  it("feeds the no-LLM rule extractor, keeping explicit graduation dates first", () => {
    const r = extractRulesHeuristic(`${drive}\nMust be graduating in 2028.`);
    expect(r).toMatchObject({ minPercent: 60, maxBacklogs: 0, gradYearMin: 2028, gradYearMax: 2028 });
  });
});

describe("academic eligibility evidence", () => {
  const student = makeProfile({
    education: [
      { school: "NIT Silchar", degree: "B.Tech Computer Science", level: "bachelors", field: "Computer Science", gradYear: 2027, gpa: "8.1/10" },
      { school: "Kendriya Vidyalaya", degree: "Class 12 (CBSE)", level: "high_school", field: null, gradYear: 2023, gpa: "88%" },
      { school: "Kendriya Vidyalaya", degree: "Class 10 (CBSE)", level: "high_school", field: null, gradYear: 2021, gpa: "57%" },
    ],
    activeBacklogs: 0,
  });

  it("fails 60% throughout on a Class 10 score, and says which marks it used", () => {
    const [marks] = academicEvidence(student, makeRules({ minPercent: 60, marksThroughout: true }));
    expect(marks.status).toBe("unmet");
    expect(marks.profileFact).toContain("Class 10 (CBSE): 57%");
  });

  it("passes degree-only cutoffs, backlogs and branch", () => {
    const ev = academicEvidence(student, makeRules({ minCgpa: 7, maxBacklogs: 0, branches: ["CSE", "IT"] }));
    expect(ev.map((e) => e.status)).toEqual(["met", "met", "met"]);
  });

  it("is unknown when the profile lacks the fact", () => {
    const bare = makeProfile({ activeBacklogs: undefined });
    const ev = academicEvidence(bare, makeRules({ maxBacklogs: 0, minPercent: 60, marksThroughout: true }));
    expect(ev.every((e) => e.status === "unknown")).toBe(true);
  });

  it("rejects the wrong branch and makes the overall verdict ineligible", () => {
    const r = checkRules(student, makePrefs(), makeRules({ branches: ["ME", "CE"] }), null, NOW);
    expect(r.verdict).toBe("ineligible");
  });

  it("treats rules stored before these fields existed as no restriction", () => {
    const legacy = { ...makeRules() } as Record<string, unknown>;
    for (const k of ["minCgpa", "minPercent", "marksThroughout", "maxBacklogs", "branches"]) delete legacy[k];
    expect(checkRules(student, makePrefs(), legacy as never, null, NOW).verdict).toBe("eligible");
  });
});
