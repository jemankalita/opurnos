import { describe, expect, it } from "vitest";
import { academicEvidence, extractAcademicRules } from "@/lib/academics";
import { extractRulesHeuristic, referralHeuristic } from "@/lib/ai/heuristics";
import { buildIcs } from "@/lib/calendar";
import { checkRules } from "@/lib/eligibility";
import { digestEmail, type DigestItem } from "@/lib/email";
import { experienceEvidence, extractExperience, isFresherFriendly, workYears } from "@/lib/experience";
import { comparePay, monthlyInr } from "@/lib/pay";
import { REFERRAL_NOTE_MAX } from "@/lib/schemas";
import { SCAM_TAG, scamSignals, withScamTag } from "@/lib/scam";
import { makePrefs, makeProfile, makeRules, NOW } from "./fixtures";

describe("scamSignals", () => {
  it.each([
    "Selected candidates must pay a refundable security deposit of Rs. 2,000 before joining.",
    "A registration fee of ₹999 is required to confirm your internship slot.",
    "Pay Rs 1500 to receive your offer letter and training kit.",
    "Send ₹500 towards registration to hr.intern@ybl and share the screenshot.",
  ])("flags: %s", (text) => {
    expect(scamSignals(text, "internship").length).toBeGreaterThan(0);
  });

  it.each([
    "There is no registration fee. We never charge candidates.",
    "Training charges: nil. The stipend is ₹15,000/month.",
    "No application fee is charged at any stage of the hiring process.",
    "Stipend of Rs 20,000 per month, paid monthly.",
  ])("leaves alone: %s", (text) => {
    expect(scamSignals(text, "internship")).toEqual([]);
  });

  it("only checks jobs and internships, where charging is the scam", () => {
    expect(scamSignals("Conference registration fee: ₹2,000", "conference")).toEqual([]);
    expect(scamSignals("GATE 2027 application fee", "exam")).toEqual([]);
  });

  it("quotes the sentence that asks for money", () => {
    const [quote] = scamSignals("Great culture. Interns pay a training fee of Rs. 3,000 in week one. Apply now.", "internship");
    expect(quote).toBe("Interns pay a training fee of Rs");
  });

  it("tags at ingest and untags when the listing changes", () => {
    expect(withScamTag(["Remote"], "Pay a joining fee of ₹1,000", "job")).toEqual([SCAM_TAG, "Remote"]);
    expect(withScamTag([SCAM_TAG, "Remote"], "No fees at all.", "job")).toEqual(["Remote"]);
  });
});

describe("experience asked for", () => {
  it.each([
    ["Requirements: 2+ years of experience in Java.", 2, false],
    ["Experience: 3-5 years", 3, false],
    ["Minimum 1 year of relevant work experience", 1, false],
    ["2 years of industry experience preferred, freshers may apply", 2, true],
    ["Freshers (0-1 years) from the 2026 batch", 0, false],
    ["Open to freshers and final-year students.", 0, false],
    ["B.Tech (4 years) in any branch.", null, false],
    ["At least 2 years of university education, or equivalent", null, false],
    ["Applicants must be at least 18 years old.", null, false],
    ["3 years of experience at a university lab", 3, false],
  ])("%s", (text, years, preferred) => {
    expect(extractExperience(text)).toEqual({ minExperienceYears: years, experiencePreferred: preferred });
  });

  it("counts full-time work only, not internships", () => {
    const profile = makeProfile({
      experience: [
        { title: "ML Intern", org: "Acme", start: "2025-05", end: "2025-07", bullets: [] },
        { title: "Software Engineer", org: "Beta", start: "2024-07", end: "2025-07", bullets: [] },
      ],
    });
    expect(workYears(profile, NOW)).toBe(1);
  });

  it("calls out a 'fresher' role that asks for years", () => {
    const [e] = experienceEvidence(makeProfile(), { minExperienceYears: 2, experiencePreferred: false }, "Fresher Software Engineer", NOW);
    expect(e).toMatchObject({ status: "unmet", requirement: 'Says "fresher" but asks for 2+ years of experience' });
    expect(e.profileFact).toMatch(/internships don't count/);
  });

  it("treats preferred experience as unknown, not a disqualifier", () => {
    const [e] = experienceEvidence(makeProfile(), { minExperienceYears: 2, experiencePreferred: true }, "SDE", NOW);
    expect(e.status).toBe("unknown");
  });

  it("feeds the eligibility check through the heuristic extractor", () => {
    const rules = extractRulesHeuristic("Graduate Engineer. Requirements: minimum 3 years of experience with AWS.");
    const check = checkRules(makeProfile(), makePrefs(), rules, null, NOW, "Graduate Engineer");
    expect(check.verdict).toBe("ineligible");
    expect(isFresherFriendly("Hiring freshers, 2026 batch")).toBe(true);
  });
});

describe("GATE", () => {
  it("reads PSU recruitment through GATE", () => {
    expect(extractAcademicRules("Recruitment of Engineer Trainees-2027 through GATE 2027")).toMatchObject({ gateRequired: true, gateYear: 2027 });
    expect(extractAcademicRules("Shortlisting based on valid GATE score.")).toMatchObject({ gateRequired: true, gateYear: null });
    expect(extractAcademicRules("Gate 3, Tech Park, Bengaluru")).toMatchObject({ gateRequired: false });
  });

  it("checks the score and its year", () => {
    const rules = makeRules({ gateRequired: true, gateYear: 2027 });
    const status = (p: Parameters<typeof academicEvidence>[0]) => academicEvidence(p, rules).find((e) => e.requirement.includes("GATE"))?.status;
    expect(status(makeProfile())).toBe("unknown");
    expect(status(makeProfile({ gateScore: 780, gateYear: 2027 }))).toBe("met");
    expect(status(makeProfile({ gateScore: 780, gateYear: 2026 }))).toBe("unmet");
  });
});

describe("pay", () => {
  it.each([
    ["₹20,000–40,000/month", 30000],
    ["₹6,00,000/year", 50000],
    ["₹4.5 LPA", 37500],
    ["INR 25k per month", 25000],
    ["Rs. 15000", 15000],
    ["₹2,40,000–3,00,000", 22500],
    ["₹3,50,000", 29167],
    ["₹ 3.5 - 4.5 LPA", 33333],
    ["INR 50,000 in prizes", null],
    ["$7,000 USD stipend", null],
    [null, null],
  ])("%s", (comp, monthly) => expect(monthlyInr(comp)).toBe(monthly));

  it("places a stipend among comparable listings", () => {
    const others = [5000, 8000, 10000, 10000, 12000, 15000, 15000, 20000, 25000, 30000].map((n) => `₹${n}/month`);
    expect(comparePay("₹20,000/month", others)).toEqual({ monthly: 20000, median: 15000, percentile: 75, samples: 10 });
    expect(comparePay("₹20,000/month", others.slice(0, 5))).toBeNull();
  });
});

describe("calendar feed", () => {
  const event = {
    id: "opp-1",
    title: "SDE Intern, Bengaluru; summer 2027",
    org: "Acme",
    deadline: new Date("2026-11-30T18:29:00Z"),
    url: "https://acme.example/apply",
    detailUrl: "https://opurnos.example/o/opp-1",
  };
  const ics = buildIcs([event], "Opurnos deadlines", NOW);

  it("is valid iCalendar: CRLF lines no longer than 75 octets", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("ends at the deadline, escapes text and reminds a day before", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DTEND:20261130T182900Z");
    expect(unfolded).toContain("DTSTART:20261130T172900Z");
    expect(unfolded).toContain("SUMMARY:Deadline: SDE Intern\\, Bengaluru\\; summer 2027 (Acme)");
    expect(unfolded).toContain("TRIGGER:-P1D");
    expect(unfolded).toContain("UID:opp-1@opurnos");
  });
});

describe("Hindi digest", () => {
  const item: DigestItem = {
    title: "SDE Intern",
    org: "Acme",
    type: "internship",
    verdict: "eligible",
    score: 82,
    why: "You know Python.",
    deadline: new Date(NOW.getTime() + 5 * 86_400_000),
    comp: null,
    applyUrl: "https://x/apply",
    detailUrl: "https://x/o/1",
  };

  it("translates the email's own words and keeps the listing as written", () => {
    const { subject, html } = digestEmail("Asha Rao", [item], "hi");
    expect(subject).toBe("आपके रडार पर 1 नए अवसर");
    expect(html).toContain('lang="hi"');
    expect(html).toContain("नमस्ते Asha");
    expect(html).toContain("इंटर्नशिप");
    expect(html).toContain("योग्य");
    expect(html).toContain("SDE Intern");
  });

  it("stays English by default", () => {
    expect(digestEmail("Asha Rao", [item]).subject).toBe("1 new opportunity on your radar");
  });
});

describe("referral request", () => {
  it("uses only profile facts and fits LinkedIn's note limit", () => {
    const r = referralHeuristic(makeProfile(), { title: "ML Engineering Intern", org: "Acme AI", description: "Python retrieval systems" });
    expect(r.note.length).toBeLessThanOrEqual(REFERRAL_NOTE_MAX);
    expect(r.note).toContain("ML Engineering Intern");
    expect(r.message).toContain("B.Tech Computer Science student at IIT Example (2028)");
    // The internship's bullets ("retrieval pipeline in Python") overlap the listing most.
    expect(r.message).toContain("I worked as ML Intern at Acme AI.");
    expect(r.message).toContain("[job link]");
  });

  it("truncates a long introduction instead of exceeding the limit", () => {
    const r = referralHeuristic(makeProfile({ name: "A".repeat(200) }), { title: "T".repeat(150), org: "Acme", description: "" });
    expect(r.note.length).toBeLessThanOrEqual(REFERRAL_NOTE_MAX);
  });
});
