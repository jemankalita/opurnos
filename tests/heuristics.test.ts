import { describe, expect, it } from "vitest";
import { extractRulesHeuristic, judgeHeuristic, parseResumeHeuristic, tailorHeuristic, verifyHeuristic } from "@/lib/ai/heuristics";
import { makeProfile } from "./fixtures";

describe("extractRulesHeuristic", () => {
  it("finds degree level, graduation window, sponsorship and team size", () => {
    const text = `Requirements: You are currently pursuing a Bachelor's or Master's degree.
      Expected graduation between 2027 and 2028. We are unable to provide visa sponsorship.
      Teams of 2 to 4. Open to all university students.`;
    const r = extractRulesHeuristic(text);
    expect(r.degreeLevels).toEqual(expect.arrayContaining(["bachelors", "masters"]));
    expect(r).toMatchObject({ gradYearMin: 2027, gradYearMax: 2028, sponsorship: "not_offered", studentsOnly: true, teamSize: "2-4" });
  });

  it("detects country restrictions and offered sponsorship", () => {
    const r = extractRulesHeuristic("Must be authorized to work in the United States. Visa sponsorship is available.");
    expect(r.countries).toEqual(["US"]);
    expect(r.sponsorship).toBe("offered");
  });

  it("returns empty rules for text without requirements", () => {
    const r = extractRulesHeuristic("A fun weekend of building things.");
    expect(r).toMatchObject({ degreeLevels: [], countries: [], gradYearMin: null, sponsorship: "unknown", studentsOnly: false });
  });
});

describe("parseResumeHeuristic", () => {
  it("reads Indian marks: CGPA for the degree and Class 12/10 percentages", () => {
    const p = parseResumeHeuristic(`Ravi Kumar
ravi@example.com
Education
NIT Example, B.Tech Electronics and Communication, 2027, CGPA: 8.4
Delhi Public School, Class XII (CBSE), 2023, 91.2%
Delhi Public School, Class X (CBSE), 2021, 94%`);
    expect(p.education.map((e) => [e.level, e.gpa])).toEqual([
      ["bachelors", "CGPA: 8.4"],
      ["high_school", "91.2%"],
      ["high_school", "94%"],
    ]);
    expect(p.education[0].field).toBe("Electronics and Communication");
  });

  it("pulls contact details and links from plain text", () => {
    const p = parseResumeHeuristic(`Asha Rao
asha@example.com | +91 90000 00000 | github.com/asha
Education
IIT Example, B.Tech Computer Science, 2028
Skills
Python, PyTorch, React`);
    expect(p.name).toBe("Asha Rao");
    expect(p.email).toBe("asha@example.com");
    expect(p.links.join(" ")).toContain("github.com/asha");
  });

  it("reads sections: summary headline, school vs degree, roles with dates and bullets, projects", () => {
    const p = parseResumeHeuristic(
      [
        "Asha Rao",
        "asha@example.com | Bengaluru, India | github.com/asha",
        "Summary",
        "Third-year CS student building ML systems. Loves robotics.",
        "Education",
        "IIT Example — B.Tech Computer Science, expected graduation 2028. CGPA 9.1/10.",
        "Experience",
        "Machine Learning Intern, Acme AI (May 2026 – Present)",
        "• Built a retrieval pipeline serving 2k daily queries",
        "Projects",
        "HackRadar — React dashboard for hackathon deadlines",
        "Achievements",
        "Smart India Hackathon finalist. Winner, college ML challenge.",
      ].join("\n"),
    );
    expect(p.headline).toBe("Third-year CS student building ML systems");
    expect(p.location).toBe("Bengaluru, India");
    expect(p.education[0]).toMatchObject({ school: "IIT Example", degree: "B.Tech Computer Science", level: "bachelors", gradYear: 2028, gpa: "9.1/10" });
    expect(p.experience).toEqual([
      { title: "Machine Learning Intern", org: "Acme AI", start: "2026-05", end: "present", bullets: ["Built a retrieval pipeline serving 2k daily queries"] },
    ]);
    expect(p.projects[0]).toMatchObject({ name: "HackRadar", tech: ["react"] });
    expect(p.achievements).toEqual(["Smart India Hackathon finalist.", "Winner, college ML challenge."]);
  });
});

describe("judgeHeuristic", () => {
  const evidence = [{ requirement: "Degree: PhD", status: "unmet" as const, listingQuote: null, profileFact: null }];

  it("explains ineligibility with the unmet requirement", () => {
    const j = judgeHeuristic({ fit: 0.9, rulesCheck: { verdict: "ineligible", evidence }, title: "t", org: "Acme", type: "fellowship", hasPrize: false, matchedKeywords: [] });
    expect(j.verdict).toBe("ineligible");
    expect(j.why).toContain("Degree: PhD");
    expect(j.gaps).toEqual(["Degree: PhD"]);
  });

  it("downgrades weak fits to stretch and mentions matched skills", () => {
    const weak = judgeHeuristic({ fit: 0.1, rulesCheck: { verdict: "eligible", evidence: [] }, title: "t", org: "Acme", type: "job", hasPrize: false, matchedKeywords: [] });
    const strong = judgeHeuristic({ fit: 0.8, rulesCheck: { verdict: "eligible", evidence: [] }, title: "t", org: "Acme", type: "hackathon", hasPrize: true, matchedKeywords: ["python"] });
    expect(weak.verdict).toBe("stretch");
    expect(strong.verdict).toBe("eligible");
    expect(strong.why).toContain("python");
    expect(strong.value).toBeGreaterThan(weak.value);
  });
});

describe("tailorHeuristic + verifyHeuristic", () => {
  const profile = makeProfile();
  const resume = "Asha Rao. Third-year CS student building ML systems. Built a retrieval pipeline in Python serving 2k daily queries. Cut inference latency by 30% with batching. Python PyTorch React";

  it("tailors from real resume bullets only", () => {
    const t = tailorHeuristic(profile, { title: "ML Intern", org: "Lab", description: "python retrieval latency" });
    const real = profile.experience.flatMap((e) => e.bullets);
    t.bullets.forEach((b) => expect(real).toContain(b.text));
    expect(t.coverLetter).toContain("Lab");
    expect(t.coverLetter).not.toMatch(/\n\n\n/);
  });

  it("marks verbatim resume claims as supported", () => {
    const report = verifyHeuristic({ summary: "Built a retrieval pipeline in Python serving 2k daily queries.", bullets: [], coverLetter: "", answers: [] }, resume);
    expect(report.claims[0].status).toBe("supported");
  });

  it("flags invented numbers as unsupported", () => {
    const report = verifyHeuristic({ summary: "Cut inference latency by 75% with batching.", bullets: [], coverLetter: "", answers: [] }, resume);
    expect(report.claims[0].status).toBe("unsupported");
    expect(report.claims[0].note).toContain("75%");
  });

  it("does not treat a sentence-ending full stop as part of a number", () => {
    const report = verifyHeuristic({ summary: "Built a retrieval pipeline serving queries since 2025.", bullets: [], coverLetter: "", answers: [] }, `${resume} Finalist 2025 hackathon`);
    expect(report.claims[0].note ?? "").not.toContain("2025");
    const invented = verifyHeuristic({ summary: "Won the ACM ICPC World Finals in 2019.", bullets: [], coverLetter: "", answers: [] }, resume);
    expect(invented.claims[0].note).toBe('"2019" does not appear in your resume.');
  });

  it("flags invented achievements as unsupported", () => {
    const report = verifyHeuristic({ summary: "Published three papers at NeurIPS and won the Turing award.", bullets: [], coverLetter: "", answers: [] }, resume);
    expect(report.claims[0].status).toBe("unsupported");
  });
});
