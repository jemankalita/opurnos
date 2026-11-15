import { describe, expect, it } from "vitest";
import { mapRecruitee, mapRippling, mapWorkable } from "@/lib/connectors/boards-ats";

describe("mapWorkable", () => {
  it("maps a remote internship", () => {
    const job = mapWorkable("Hugging Face", {
      title: "Research Intern",
      shortcode: "ABC123",
      employment_type: "Internship",
      telecommuting: true,
      department: "Science",
      url: "https://apply.workable.com/huggingface/j/ABC123",
      application_url: "https://apply.workable.com/huggingface/j/ABC123/apply",
      published_on: "2026-11-01",
      description: "<p>Train models.</p>",
      city: "Paris",
      country: "France",
    });
    expect(job).toMatchObject({
      externalId: "ABC123",
      ats: "workable",
      type: "internship",
      remote: true,
      org: "Hugging Face",
      locations: ["Paris, France"],
      tags: ["Science"],
      description: "Train models.",
    });
    expect(job?.postedAt?.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  it("drops a job with no shortcode", () => {
    expect(mapWorkable("Hugging Face", { title: "Engineer", url: "https://example.com" })).toBeNull();
  });
});

describe("mapRecruitee", () => {
  it("parses the non-ISO timestamp and salary", () => {
    const offer = mapRecruitee("bunq", {
      id: 7,
      title: "Backend Engineer",
      city: "Amsterdam",
      country: "Netherlands",
      remote: false,
      careers_url: "https://bunq.recruitee.com/o/backend",
      published_at: "2026-11-11 13:21:40 UTC",
      salary: { min: 60000, max: 80000, currency: "EUR", period: "year" },
      description: "<p>Build the bank.</p>",
      requirements: "<p>TypeScript.</p>",
    });
    expect(offer).toMatchObject({
      externalId: "7",
      ats: "recruitee",
      type: "job",
      comp: "EUR 60000–80000 year",
      locations: ["Amsterdam, Netherlands"],
      description: "Build the bank.\n\nTypeScript.",
    });
    expect(offer?.postedAt?.toISOString()).toBe("2026-11-11T13:21:40.000Z");
  });
});

describe("mapRippling", () => {
  it("keeps the list payload, which has no description", () => {
    const job = mapRippling("Rippling", {
      id: "job-1",
      name: "Software Engineer Intern",
      url: "https://ats.rippling.com/rippling/jobs/job-1",
      department: { name: "Engineering" },
      locations: [{ name: "Remote - India" }],
    });
    expect(job).toMatchObject({
      ats: "rippling",
      type: "internship",
      remote: true,
      locations: ["Remote - India"],
      tags: ["Engineering"],
      description: "Software Engineer Intern · Engineering · Remote - India",
    });
  });
});
