/**
 * Live-model code paths against a local server that speaks the OpenAI wire format
 * (OpenAI's Chat Completions and Responses APIs). Exercises the real SDK, request shapes and fallbacks.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePrefs, makeProfile } from "./fixtures";

type Reply = { status: number; body: unknown };
type Seen = { path: string; body: Record<string, unknown> };

const replies: Reply[] = [];
const seen: Seen[] = [];

const chat = (content: string, usage = { prompt_tokens: 1000, completion_tokens: 500 }): Reply => ({
  status: 200,
  body: { id: "c1", object: "chat.completion", created: 0, model: "m", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }], usage },
});
const apiError = (status: number, message: string): Reply => ({ status, body: { error: { message, type: "invalid_request_error" } } });

const server: Server = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    seen.push({ path: req.url ?? "", body: raw ? JSON.parse(raw) : {} });
    const reply = replies.shift() ?? apiError(500, "no reply queued");
    res.writeHead(reply.status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply.body));
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

const dataDir = mkdtempSync(path.join(os.tmpdir(), "opurnos-model-"));
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.MODEL_API_KEY = "test-key";
process.env.MODEL_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
process.env.PRO_DAILY_AI_USD = "1";
(globalThis as { __opurnosDb?: unknown }).__opurnosDb = undefined;

const agents = await import("@/lib/ai/agents");
const client = await import("@/lib/ai/client");
const { getDb, schema } = await import("@/lib/db");
const { EMPTY_RULES } = await import("@/lib/schemas");

const RULES_JSON = JSON.stringify({ ...EMPTY_RULES, degreeLevels: ["bachelors"], studentsOnly: true });
const opp = { title: "ML Fellowship", org: "Lab", description: "Open to undergraduate students." };

beforeAll(async () => {
  await getDb();
}, 120_000);

beforeEach(() => {
  replies.length = 0;
  seen.length = 0;
});

afterAll(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("structured()", () => {
  it("uses strict json_schema on the public model for public listings and logs cost", async () => {
    replies.push(chat(RULES_JSON));
    const result = await agents.extractRules(opp);
    expect(result.by).toBe("gpt-6-luna");
    expect(result.value).toMatchObject({ degreeLevels: ["bachelors"], studentsOnly: true });
    const req = seen[0].body as { model: string; response_format: { type: string; json_schema: { strict: boolean; schema: { additionalProperties: boolean } } } };
    expect(seen[0].path).toBe("/v1/chat/completions");
    expect(req.model).toBe("gpt-6-luna");
    expect(req.response_format.type).toBe("json_schema");
    expect(req.response_format.json_schema.strict).toBe(true);
    expect(req.response_format.json_schema.schema.additionalProperties).toBe(false);
    const db = await getDb();
    const [run] = await db.select().from(schema.agentRuns);
    expect(run).toMatchObject({ kind: "extract_rules", ok: true, tokensIn: 1000, tokensOut: 500 });
    expect(run.costUsd).toBeGreaterThan(0);
  });

  it("falls back to json_object when strict mode is rejected, and tolerates fenced JSON", async () => {
    replies.push(apiError(400, "json_schema not supported"), chat("```json\n" + RULES_JSON + "\n```"));
    const result = await agents.extractRules(opp);
    expect(result.value.studentsOnly).toBe(true);
    expect((seen[1].body.response_format as { type: string }).type).toBe("json_object");
    expect(JSON.stringify(seen[1].body.messages)).toContain("JSON Schema");
  });

  it("does not retry the fallback format on auth errors and degrades to heuristics", async () => {
    replies.push(apiError(401, "bad key"));
    const result = await agents.extractRules(opp);
    expect(seen).toHaveLength(1);
    expect(result.by).toBe("rules");
    const db = await getDb();
    const runs = await db.select().from(schema.agentRuns);
    expect(runs.some((r) => !r.ok && r.error?.includes("bad key"))).toBe(true);
  });

  it("rejects output that doesn't match the schema", async () => {
    replies.push(chat('{"degreeLevels":"not-an-array"}'), chat("no json here"));
    const result = await agents.extractRules(opp);
    expect(result.by).toBe("rules");
  });
});

describe("agents on the live path", () => {
  const profile = makeProfile();
  const prefs = makePrefs();

  it("sends the resume PDF as a file part", async () => {
    replies.push(chat(JSON.stringify(profile)));
    const result = await agents.parseResume({ userId: "u-pdf", text: "fallback text", pdfBase64: "JVBERi0=", fileName: "cv.pdf" });
    expect(result.value.name).toBe("Asha Rao");
    const content = (seen[0].body.messages as { content: unknown }[])[1].content as { type: string; file?: { file_data: string } }[];
    expect(content[1].type).toBe("file");
    expect(content[1].file?.file_data).toBe("data:application/pdf;base64,JVBERi0=");
  });

  it("retries resume parsing with text when the PDF part is refused", async () => {
    replies.push(apiError(400, "file parts unsupported"), apiError(400, "still no"), chat(JSON.stringify(profile)));
    const result = await agents.parseResume({ userId: "u-pdf", text: "Asha Rao resume", pdfBase64: "JVBERi0=" });
    expect(result.by).toBe("gpt-6.1-terra");
    expect(JSON.stringify(seen[2].body.messages)).toContain("Asha Rao resume");
  });

  it("judges, tailors and verifies with the default model", async () => {
    const judgement = { verdict: "likely", fit: 0.8, value: 0.6, why: "Strong ML background.", evidence: [], gaps: [] };
    const tailored = { summary: "S", bullets: [{ section: "Acme", text: "Built a retrieval pipeline" }], coverLetter: "Dear Lab", answers: [] };
    const report = { claims: [{ claim: "Built a retrieval pipeline", status: "supported", source: "Built a retrieval pipeline", note: null }] };
    replies.push(chat(JSON.stringify(judgement)), chat(JSON.stringify(tailored)), chat(JSON.stringify(report)));

    const j = await agents.judge({
      userId: "u1",
      profile,
      prefs,
      opp: { ...opp, type: "fellowship", deadline: new Date("2026-12-01"), locations: [], remote: true, comp: "$5k" },
      rulesCheck: { verdict: "eligible", evidence: [] },
      fit: 0.6,
      matchedKeywords: ["ml"],
    });
    expect(j).toMatchObject({ by: "gpt-6.1-terra", value: { verdict: "likely" } });
    const t = await agents.tailor({ userId: "u1", profile, resumeText: "resume", opp: { ...opp, type: "fellowship" } });
    expect(t.value.coverLetter).toBe("Dear Lab");
    const v = await agents.verify({ userId: "u1", tailored: t.value, resumeText: "resume" });
    expect(v.value.claims[0].status).toBe("supported");
    expect(JSON.stringify(seen[2].body.messages)).toContain("TAILORED MATERIALS");
  });

  it("keeps only scout leads on hosts the search actually cited", async () => {
    replies.push({
      status: 200,
      body: {
        id: "r1",
        object: "response",
        created_at: 0,
        model: "m",
        status: "completed",
        output_text: "",
        output: [
          {
            type: "message",
            id: "m1",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: [
                  "Real Fellowship | Real Org | fellowship | 2099-01-01 | https://www.real.org/apply | Cited",
                  "Fake Grant | Nowhere | grant | 2099-01-01 | https://invented.example/apply | Not cited",
                ].join("\n"),
                annotations: [{ type: "url_citation", url: "https://real.org/page", title: "Real", start_index: 0, end_index: 1 }],
              },
            ],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      },
    });
    const leads = await agents.scout({ userId: "u-scout", profile, prefs });
    expect(seen[0].path).toBe("/v1/responses");
    expect((seen[0].body.tools as { type: string; user_location?: { country: string } }[])[0]).toMatchObject({ type: "web_search", user_location: { country: "IN" } });
    expect(leads.map((l) => l.title)).toEqual(["Real Fellowship"]);
  });
});

describe("budget guard", () => {
  it("blocks per-user calls once today's spend reaches the cap, without falling back", async () => {
    const db = await getDb();
    await db.insert(schema.agentRuns).values({ userId: "u-broke", kind: "judge", model: "m", tokensIn: 0, tokensOut: 0, costUsd: 5, ms: 1, ok: true });
    expect(await client.spentToday("u-broke")).toBe(5);
    await expect(agents.tailor({ userId: "u-broke", profile: makeProfile(), resumeText: "r", opp: { ...opp, type: "job" } })).rejects.toBeInstanceOf(client.BudgetExceededError);
    expect(seen).toHaveLength(0);
  });

  it("estimates cost from token counts with a default price for unknown models", () => {
    expect(client.estimateCost("gpt-6.1-terra", 1_000_000, 0)).toBeCloseTo(1);
    expect(client.estimateCost("gpt-6-luna", 1_000_000, 1_000_000)).toBeCloseTo(0.6);
    expect(client.estimateCost("unknown-model", 1_000_000, 1_000_000)).toBeCloseTo(12);
  });
});

describe("createChat", () => {
  it("drops a sampling parameter the model rejects, retries, and remembers it", async () => {
    replies.push(apiError(400, "Unsupported parameter: 'temperature' is not supported with this model."), chat("hi"), chat("again"));
    const first = await client.createChat({ model: "strict-model", temperature: 0.2, messages: [{ role: "user", content: "x" }] });
    expect(first.choices[0].message.content).toBe("hi");
    expect(seen.map((s) => "temperature" in s.body)).toEqual([true, false]);
    await client.createChat({ model: "strict-model", temperature: 0.2, messages: [{ role: "user", content: "y" }] });
    expect("temperature" in seen[2].body).toBe(false);
  });

  it("doesn't retry other bad requests", async () => {
    replies.push(apiError(400, "Invalid 'messages': empty."));
    await expect(client.createChat({ model: "m2", temperature: 0, messages: [] })).rejects.toThrow(/messages/);
    expect(seen).toHaveLength(1);
  });
});
