import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseScoutLines } from "@/lib/ai/agents";
import { toStrictJsonSchema } from "@/lib/ai/client";
import { planHeuristicFill } from "@/lib/apply/agent";
import type { FormField } from "@/lib/apply/browser";
import { SUBMIT_RE } from "@/lib/apply/browser";
import { contentHash, decodeEntities, htmlToText, parseDate, tokenize, truncate } from "@/lib/text";
import { signToken, verifyToken } from "@/lib/tokens";
import { deadlineLabel } from "@/lib/utils";
import { makeProfile, NOW } from "./fixtures";

describe("text utilities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#39;24 &#x2014;")).toBe("Tom & Jerry '24 —");
  });

  it("converts (escaped) HTML into readable text", () => {
    expect(htmlToText("&lt;ul&gt;&lt;li&gt;Python&lt;/li&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;")).toBe("• Python\n• Go");
    expect(htmlToText("<script>x()</script><p>Hi<br>there</p>")).toBe("Hi\nthere");
    expect(htmlToText(null)).toBe("");
  });

  it("tokenizes keeping c++ / c# and dropping stopwords", () => {
    expect(tokenize("The C++ and C# engineer, with Python.")).toEqual(["c++", "c#", "engineer", "python"]);
  });

  it("builds a stable, punctuation-insensitive content hash", () => {
    expect(contentHash("Stripe, Inc.", "SWE Intern")).toBe(contentHash("stripe inc", "swe   intern"));
    expect(contentHash("Stripe", "SWE Intern")).not.toBe(contentHash("Stripe", "PM Intern"));
  });

  it("truncates with an ellipsis", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });

  it("parses seconds, milliseconds and ISO strings", () => {
    expect(parseDate(1_790_000_000)?.getUTCFullYear()).toBe(2026);
    expect(parseDate(1_790_000_000_000)?.getUTCFullYear()).toBe(2026);
    expect(parseDate("2026-11-01")?.toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(parseDate("nope")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("deadlineLabel", () => {
  it("labels rolling, closed and upcoming deadlines", () => {
    expect(deadlineLabel(null)).toBe("Rolling");
    expect(deadlineLabel(new Date(Date.now() - 86_400_000))).toBe("Closed");
    expect(deadlineLabel(new Date(Date.now() + 5 * 86_400_000 + 3_600_000))).toMatch(/5 days left/);
  });
});

describe("parseScoutLines", () => {
  it("keeps well-formed future leads and strips list markers", () => {
    const text = [
      "1. Rhodes Scholarship | Rhodes Trust | scholarship | 2026-12-15 | https://rhodeshouse.ox.ac.uk/apply). | Postgrad at Oxford",
      "- Old Fellowship | Org | fellowship | 2025-01-01 | https://old.org | expired",
      "Bad | Org | job | 2026-12-01 | https://x.org | jobs are not scouted",
      "No URL | Org | grant | rolling | not-a-url",
      "Rolling Grant | Fund | grant | rolling | https://fund.org",
    ].join("\n");
    const leads = parseScoutLines(text, NOW);
    expect(leads.map((l) => l.title)).toEqual(["Rhodes Scholarship", "Rolling Grant"]);
    expect(leads[0].url).toBe("https://rhodeshouse.ox.ac.uk/apply");
    expect(leads[0].deadline?.toISOString().slice(0, 10)).toBe("2026-12-15");
    expect(leads[1].deadline).toBeNull();
  });
});

describe("toStrictJsonSchema", () => {
  it("closes every object and requires all properties", () => {
    const schema = toStrictJsonSchema(z.object({ a: z.string(), nested: z.object({ b: z.number().nullable() }) }));
    expect(schema).toMatchObject({ additionalProperties: false, required: ["a", "nested"] });
    const nested = (schema.properties as Record<string, Record<string, unknown>>).nested;
    expect(nested).toMatchObject({ additionalProperties: false, required: ["b"] });
    expect(schema.$schema).toBeUndefined();
  });
});

describe("tokens", () => {
  it("round-trips claims for the right purpose only", async () => {
    const token = await signToken({ sub: "u1", email: "a@b.co" }, "magic", 60);
    expect(await verifyToken(token, "magic")).toMatchObject({ sub: "u1", email: "a@b.co" });
    expect(await verifyToken(token, "session")).toBeNull();
  });

  it("rejects tampered and expired tokens", async () => {
    const token = await signToken({ sub: "u1" }, "session", 60);
    expect(await verifyToken(`${token.slice(0, -2)}xx`, "session")).toBeNull();
    const expired = await signToken({ sub: "u1" }, "session", -10);
    expect(await verifyToken(expired, "session")).toBeNull();
  });
});

describe("SUBMIT_RE (submit guard)", () => {
  it.each(["Submit application", "Apply now", "Send application"])("blocks %s", (t) => expect(SUBMIT_RE.test(t)).toBe(true));
  it.each(["Next", "Upload resume", "Save draft"])("allows %s", (t) => expect(SUBMIT_RE.test(t)).toBe(false));
});

describe("planHeuristicFill", () => {
  const field = (id: string, label: string, extra: Partial<FormField> = {}): FormField => ({ id, tag: "input", type: "text", role: "", label, required: false, value: "", ...extra });
  const applicant = {
    profile: makeProfile(),
    email: "asha@example.com",
    tailored: { summary: "", bullets: [], coverLetter: "Dear team", answers: [{ question: "Why Acme?", answer: "Because ML." }] },
  };

  it("fills standard fields from the profile", () => {
    const actions = planHeuristicFill(
      [
        field("1", "First Name"),
        field("2", "Last Name"),
        field("3", "Email"),
        field("4", "LinkedIn Profile"),
        field("5", "GitHub URL"),
        field("6", "School"),
        field("7", "Cover Letter", { tag: "textarea" }),
        field("8", "Why do you want to work here?", { tag: "textarea" }),
        field("9", "Resume/CV", { type: "file" }),
      ],
      applicant,
    );
    const byId = Object.fromEntries(actions.map((a) => ["id" in a ? a.id : a.kind, a]));
    expect(byId["1"]).toMatchObject({ kind: "fill", value: "Asha" });
    expect(byId["2"]).toMatchObject({ value: "Rao" });
    expect(byId["3"]).toMatchObject({ value: "asha@example.com" });
    expect(byId["4"]).toMatchObject({ value: "https://linkedin.com/in/asha" });
    expect(byId["5"]).toMatchObject({ value: "https://github.com/asha" });
    expect(byId["6"]).toMatchObject({ value: "IIT Example" });
    expect(byId["7"]).toMatchObject({ value: "Dear team" });
    expect(byId["8"]).toMatchObject({ value: "Because ML." });
    expect(byId["9"]).toMatchObject({ kind: "upload" });
  });

  it("declines EEO questions and leaves filled or unknown fields alone", () => {
    const actions = planHeuristicFill(
      [
        field("g", "Gender", { tag: "select", options: ["Male", "Female", "Decline to self-identify"] }),
        field("e", "Email", { value: "already@set.com" }),
        field("x", "Favourite colour"),
        field("c", "I agree", { type: "checkbox" }),
      ],
      applicant,
    );
    expect(actions).toEqual([{ kind: "select", id: "g", option: "Decline to self-identify" }]);
  });
});
