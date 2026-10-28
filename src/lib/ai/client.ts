import OpenAI from "openai";
import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { env, isDemoMode } from "../env";
import { getDb, schema } from "../db";
import { getPlan, planLimits } from "../plans";

// USD per 1M tokens, standard tier, from OpenAI's pricing page (checked 2026-10-29).
// Used for per-plan budgets and the usage panel, not for billing.
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-6-astra": { in: 10, out: 50 },
  "gpt-6.1-sol": { in: 2, out: 10 },
  "gpt-6.1-terra": { in: 1, out: 5 },
  "gpt-6-luna": { in: 0.1, out: 0.5 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5 },
  "gpt-5.4-nano": { in: 0.2, out: 1.25 },
};
const DEFAULT_PRICE = { in: 2, out: 10 };
// The web_search tool is billed per call on top of tokens.
const WEB_SEARCH_CALL_USD = 0.01;

export class BudgetExceededError extends Error {
  constructor() {
    super("Today's AI allowance for this account is used up. It resets at midnight UTC; Pro has a larger allowance.");
  }
}

let client: OpenAI | null = null;
export function getClient(): OpenAI {
  if (isDemoMode) throw new Error("MODEL_API_KEY is not set (demo mode).");
  client ??= new OpenAI({
    apiKey: env.MODEL_API_KEY,
    baseURL: env.MODEL_BASE_URL,
    maxRetries: 3,
    timeout: 90_000,
  });
  return client;
}

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? DEFAULT_PRICE;
  return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}

export async function spentToday(userId: string): Promise<number> {
  const db = await getDb();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.agentRuns.costUsd}), 0)` })
    .from(schema.agentRuns)
    .where(and(eq(schema.agentRuns.userId, userId), gte(schema.agentRuns.createdAt, since)));
  return Number(row?.total ?? 0);
}

async function assertBudget(userId: string | null) {
  if (!userId) return; // shared/public work (listing extraction) is budgeted by the cron cadence
  const { dailyAiUsd } = planLimits(await getPlan(userId));
  if ((await spentToday(userId)) >= dailyAiUsd) throw new BudgetExceededError();
}

// Newer reasoning models reject sampling parameters such as temperature. When the API says a
// parameter is unsupported we drop it, retry, and remember that for the model.
const OPTIONAL_PARAMS = ["temperature", "reasoning_effort"] as const;
const unsupported = new Map<string, Set<string>>();

function rejectedParam(err: unknown): string | null {
  if (!(err instanceof OpenAI.APIError) || err.status !== 400) return null;
  const text = `${err.message} ${JSON.stringify(err.error ?? "")}`.toLowerCase();
  return OPTIONAL_PARAMS.find((p) => text.includes(p)) ?? null;
}

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export async function createChat(params: ChatParams): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const skip = unsupported.get(params.model) ?? new Set<string>();
  const request = Object.fromEntries(Object.entries(params).filter(([k]) => !skip.has(k))) as ChatParams;
  try {
    return await getClient().chat.completions.create(request);
  } catch (err) {
    const param = rejectedParam(err);
    if (!param || skip.has(param) || !(param in request)) throw err;
    unsupported.set(params.model, new Set([...skip, param]));
    return createChat(params);
  }
}

export async function logRun(entry: {
  userId: string | null;
  kind: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  ms: number;
  ok: boolean;
  error?: string;
  /** Per-call fees on top of tokens, e.g. web search. */
  extraUsd?: number;
}) {
  try {
    const db = await getDb();
    const tokensIn = entry.tokensIn ?? 0;
    const tokensOut = entry.tokensOut ?? 0;
    await db.insert(schema.agentRuns).values({
      userId: entry.userId,
      kind: entry.kind,
      model: entry.model,
      tokensIn,
      tokensOut,
      costUsd: estimateCost(entry.model, tokensIn, tokensOut) + (entry.extraUsd ?? 0),
      ms: entry.ms,
      ok: entry.ok,
      error: entry.error?.slice(0, 500),
    });
  } catch (err) {
    console.error("[ai] failed to log run", err);
  }
}

/** Zod 4 → JSON Schema in the strict shape OpenAI-style APIs expect. */
export function toStrictJsonSchema(schemaDef: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schemaDef, { target: "draft-7" }) as Record<string, unknown>;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.type === "object" && obj.properties) {
      obj.additionalProperties = false;
      obj.required = Object.keys(obj.properties as object);
    }
    delete obj.$schema;
    Object.values(obj).forEach((v) => (Array.isArray(v) ? v.forEach(visit) : visit(v)));
  };
  visit(json);
  return json;
}

type ContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart;

export type StructuredRequest<T extends z.ZodType> = {
  kind: string;
  userId: string | null;
  model?: string;
  system: string;
  user: string | ContentPart[];
  schema: T;
  schemaName: string;
  temperature?: number;
};

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON object");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Schema-guaranteed JSON from the model. Tries strict json_schema first and falls
 * back to json_object + schema-in-prompt if the endpoint rejects strict mode.
 */
export async function structured<T extends z.ZodType>(req: StructuredRequest<T>): Promise<z.infer<T>> {
  await assertBudget(req.userId);
  const model = req.model ?? env.MODEL_DEFAULT;
  const jsonSchema = toStrictJsonSchema(req.schema);
  const started = Date.now();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: req.system },
    { role: "user", content: req.user },
  ];

  const attempts: Array<() => Promise<OpenAI.Chat.Completions.ChatCompletion>> = [
    () =>
      createChat({
        model,
        messages,
        temperature: req.temperature ?? 0.2,
        response_format: {
          type: "json_schema",
          json_schema: { name: req.schemaName, schema: jsonSchema, strict: true },
        },
      }),
    () =>
      createChat({
        model,
        temperature: req.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${req.system}\n\nRespond with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`,
          },
          { role: "user", content: req.user },
        ],
      }),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      const text = res.choices[0]?.message?.content ?? "";
      const value = req.schema.parse(extractJson(text));
      await logRun({
        userId: req.userId,
        kind: req.kind,
        model,
        tokensIn: res.usage?.prompt_tokens,
        tokensOut: res.usage?.completion_tokens,
        ms: Date.now() - started,
        ok: true,
      });
      return value;
    } catch (err) {
      lastError = err;
      // Auth and budget problems won't be fixed by the fallback format.
      if (err instanceof OpenAI.APIError && (err.status === 401 || err.status === 403)) break;
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await logRun({ userId: req.userId, kind: req.kind, model, ms: Date.now() - started, ok: false, error: message });
  throw new Error(`[${req.kind}] structured call failed: ${message}`);
}

export type Citation = { url: string; title: string };

/** Live web search grounding (Responses API + web_search tool) with url citations. */
export async function searchGrounded(opts: {
  kind: string;
  userId: string | null;
  instructions: string;
  input: string;
  country?: string | null;
}): Promise<{ text: string; citations: Citation[] }> {
  await assertBudget(opts.userId);
  const model = env.MODEL_DEFAULT;
  const started = Date.now();
  try {
    const tool: Record<string, unknown> = { type: "web_search", search_context_size: "high" };
    if (opts.country) tool.user_location = { type: "approximate", country: opts.country };
    const res = await getClient().responses.create({
      model,
      instructions: opts.instructions,
      input: opts.input,
      tools: [tool as unknown as OpenAI.Responses.Tool],
    });
    const citations: Citation[] = [];
    for (const item of res.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content) {
        if (part.type !== "output_text") continue;
        for (const a of part.annotations ?? []) {
          if (a.type === "url_citation") citations.push({ url: a.url, title: a.title });
        }
      }
    }
    await logRun({
      userId: opts.userId,
      kind: opts.kind,
      model,
      tokensIn: res.usage?.input_tokens,
      tokensOut: res.usage?.output_tokens,
      ms: Date.now() - started,
      ok: true,
      extraUsd: (res.output ?? []).filter((i) => i.type === "web_search_call").length * WEB_SEARCH_CALL_USD,
    });
    return { text: res.output_text ?? "", citations };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logRun({ userId: opts.userId, kind: opts.kind, model, ms: Date.now() - started, ok: false, error: message });
    throw err;
  }
}
