import type OpenAI from "openai";
import type { Page } from "playwright-core";
import { env, isDemoMode } from "../env";
import { createChat, logRun } from "../ai/client";
import type { Profile, Tailored } from "../schemas";
import { act, screenshot, snapshotFields, type Action, type FormField } from "./browser";

export type Applicant = { profile: Profile; email: string; tailored: Tailored };
export type StepLogger = (kind: "thought" | "action" | "system" | "error", message: string, shot?: string) => Promise<void>;
export type FillOutcome = { status: "review" | "handoff"; reason: string };

const MAX_STEPS = 40;
const TIME_LIMIT_MS = 5 * 60_000;

// ---------------- Deterministic pre-fill (fast, free, testable) ----------------

const EEO_RE = /\b(gender|race|ethnicity|veteran|disability|hispanic|latino|sexual orientation|pronoun)/i;
const DECLINE_RE = /(decline|prefer not|don't wish|do not wish|not to (say|answer|disclose)|choose not)/i;

function answerFor(tailored: Tailored, label: string): string | null {
  const l = label.toLowerCase();
  const hit = tailored.answers.find((a) => {
    const q = a.question.toLowerCase();
    return (l.includes("why") && q.includes("why")) || (l.includes("project") && q.includes("project")) || (l.includes("anything else") && q.includes("anything else"));
  });
  return hit?.answer ?? null;
}

/** Maps standard application fields to profile facts. Anything it can't map is left to the agent. */
export function planHeuristicFill(fields: FormField[], a: Applicant): Action[] {
  const p = a.profile;
  const [first, ...rest] = p.name.split(/\s+/);
  const link = (re: RegExp) => p.links.find((l) => re.test(l)) ?? null;
  const edu = p.education[0];
  const actions: Action[] = [];
  for (const f of fields) {
    const label = f.label.toLowerCase();
    if (f.type === "file") {
      if (/resume|cv/.test(label) || fields.filter((x) => x.type === "file").indexOf(f) === 0) actions.push({ kind: "upload", id: f.id });
      continue;
    }
    if (f.value && f.value !== "false" && !/^select/i.test(f.value)) continue; // already filled
    if (f.tag === "select" && f.options) {
      if (EEO_RE.test(label)) {
        const decline = f.options.find((o) => DECLINE_RE.test(o));
        if (decline) actions.push({ kind: "select", id: f.id, option: decline });
      }
      continue;
    }
    if (!["input", "textarea"].includes(f.tag) || ["checkbox", "radio", "submit", "button"].includes(f.type)) continue;
    let value: string | null = null;
    if (/first name|given name|^first\b/.test(label)) value = first;
    else if (/last name|family name|surname/.test(label)) value = rest.join(" ") || null;
    else if (/full name|^name\b|your name/.test(label)) value = p.name;
    else if (/e-?mail/.test(label)) value = a.email || p.email;
    else if (/phone|mobile/.test(label)) value = p.phone;
    else if (/linkedin/.test(label)) value = link(/linkedin/i);
    else if (/github/.test(label)) value = link(/github/i);
    else if (/website|portfolio|personal site/.test(label)) value = link(/^(?!.*(linkedin|github))/i);
    else if (/\b(city|location|where are you based)\b/.test(label)) value = p.location;
    else if (/school|university|college/.test(label)) value = edu?.school ?? null;
    else if (/degree/.test(label)) value = edu?.degree ?? null;
    else if (/graduat/.test(label)) value = edu?.gradYear ? String(edu.gradYear) : null;
    else if (/cover letter/.test(label) && f.tag === "textarea") value = a.tailored.coverLetter;
    else if (f.tag === "textarea") value = answerFor(a.tailored, label);
    if (value) actions.push({ kind: "fill", id: f.id, value });
  }
  return actions;
}

// ---------------- Browser agent loop (vision + tools) ----------------

const SYSTEM = `You are Opurnos's Apply Agent. You operate a real web browser to fill in ONE job/opportunity application on behalf of the applicant.
Each turn you get: the applicant's data, the approved materials, your action history, the list of interactive elements (with ids), and a screenshot.
Call exactly ONE tool per turn.
Rules:
- Use only the applicant's data and approved materials. Never invent facts, numbers, links or answers.
- If a required question can't be answered truthfully from the data, leave it and mention it in request_review.
- For demographic / EEO questions choose "Decline to self-identify" (or the closest equivalent).
- Prefer element ids. Use click_at (screenshot pixel coordinates) only when no id fits.
- NEVER submit. When the form is filled (or as filled as it truthfully can be), call request_review.
- If you hit a CAPTCHA, a login/account wall, a payment step, or an unexpected site, call handoff with the reason.
- Look at the screenshot after each action to confirm it worked before moving on.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  fn("fill_field", "Type text into an input or textarea.", { id: { type: "string" }, value: { type: "string" } }, ["id", "value"]),
  fn("select_option", "Choose an option in a <select> by its visible label.", { id: { type: "string" }, option: { type: "string" } }, ["id", "option"]),
  fn("set_checkbox", "Check or uncheck a checkbox/radio.", { id: { type: "string" }, checked: { type: "boolean" } }, ["id", "checked"]),
  fn("upload_resume", "Attach the applicant's resume PDF to a file input.", { id: { type: "string" } }, ["id"]),
  fn("click_element", "Click a button/link/element by id (not the final submit).", { id: { type: "string" } }, ["id"]),
  fn("click_at", "Click at screenshot pixel coordinates.", { x: { type: "integer" }, y: { type: "integer" } }, ["x", "y"]),
  fn("scroll", "Scroll the page vertically by pixels (positive = down).", { dy: { type: "integer" } }, ["dy"]),
  fn("request_review", "Stop: the form is ready for the applicant to review before submission.", { summary: { type: "string" }, unanswered: { type: "array", items: { type: "string" } } }, ["summary", "unanswered"]),
  fn("handoff", "Stop: this application needs the human (captcha, login wall, unsupported flow).", { reason: { type: "string" } }, ["reason"]),
];

function fn(name: string, description: string, properties: Record<string, unknown>, required: string[]): OpenAI.Chat.Completions.ChatCompletionTool {
  return { type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } } };
}

function applicantBrief(a: Applicant): string {
  const p = a.profile;
  return JSON.stringify({
    name: p.name,
    email: a.email || p.email,
    phone: p.phone,
    location: p.location,
    links: p.links,
    education: p.education,
    experience: p.experience.map((e) => ({ title: e.title, org: e.org, start: e.start, end: e.end })),
    skills: p.skills,
    approvedMaterials: a.tailored,
  });
}

function toAction(name: string, args: Record<string, unknown>): Action | null {
  switch (name) {
    case "fill_field": return { kind: "fill", id: String(args.id), value: String(args.value ?? "") };
    case "select_option": return { kind: "select", id: String(args.id), option: String(args.option ?? "") };
    case "set_checkbox": return { kind: "check", id: String(args.id), checked: Boolean(args.checked) };
    case "upload_resume": return { kind: "upload", id: String(args.id) };
    case "click_element": return { kind: "click", id: String(args.id) };
    case "click_at": return { kind: "click_xy", x: Number(args.x), y: Number(args.y) };
    case "scroll": return { kind: "scroll", dy: Number(args.dy) };
    default: return null;
  }
}

function describe(a: Action): string {
  switch (a.kind) {
    case "fill": return `fill ${a.id} = "${a.value.slice(0, 60)}${a.value.length > 60 ? "…" : ""}"`;
    case "select": return `select ${a.id} → ${a.option}`;
    case "check": return `${a.checked ? "check" : "uncheck"} ${a.id}`;
    case "upload": return `upload resume → ${a.id}`;
    case "click": return `click ${a.id}`;
    case "click_xy": return `click at (${a.x}, ${a.y})`;
    case "scroll": return `scroll ${a.dy}`;
    case "press": return `press ${a.key}`;
  }
}

export async function runFillAgent(opts: {
  page: Page;
  userId: string;
  applicant: Applicant;
  resumePath: string | null;
  log: StepLogger;
}): Promise<FillOutcome> {
  const { page, log } = opts;
  const deadline = Date.now() + TIME_LIMIT_MS;
  const history: string[] = [];

  // 1) Deterministic pre-fill of the standard fields.
  const fields = await snapshotFields(page);
  const plan = planHeuristicFill(fields, opts.applicant);
  for (const a of plan) {
    const result = await act(page, a, { allowSubmit: false, resumePath: opts.resumePath }).catch((e: Error) => `Failed: ${e.message}`);
    history.push(`${describe(a)} → ${result}`);
  }
  await log("action", `Pre-filled ${plan.length} standard fields from your profile.`, await screenshot(page));

  if (isDemoMode) {
    return { status: "review", reason: "Rules-only mode: standard fields were filled by rules. Add an OpenAI API key to let the agent handle custom questions." };
  }

  // 2) The model handles everything else, one observed action at a time.
  for (let step = 0; step < MAX_STEPS; step++) {
    if (Date.now() > deadline) return { status: "handoff", reason: "The agent ran out of time. Finish the remaining fields yourself." };
    const shot = await screenshot(page);
    const current = await snapshotFields(page);
    const started = Date.now();
    let res: OpenAI.Chat.Completions.ChatCompletion;
    try {
      res = await createChat({
        model: env.MODEL_AGENT,
        tools: TOOLS,
        tool_choice: "required",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `APPLICANT:\n${applicantBrief(opts.applicant)}\n\nHISTORY (oldest first):\n${history.slice(-25).join("\n") || "(none)"}\n\nPAGE: ${page.url()}\nELEMENTS:\n${JSON.stringify(current)}`,
              },
              // Only the latest screenshot is sent: keeps each request far below the 50-image cap.
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${shot}` } },
            ],
          },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logRun({ userId: opts.userId, kind: "apply_agent", model: env.MODEL_AGENT, ms: Date.now() - started, ok: false, error: message });
      return { status: "handoff", reason: `The agent couldn't continue (${message.slice(0, 120)}).` };
    }
    await logRun({
      userId: opts.userId,
      kind: "apply_agent",
      model: env.MODEL_AGENT,
      tokensIn: res.usage?.prompt_tokens,
      tokensOut: res.usage?.completion_tokens,
      ms: Date.now() - started,
      ok: true,
    });

    const msg = res.choices[0]?.message;
    if (msg?.content) await log("thought", msg.content.slice(0, 400));
    const call = msg?.tool_calls?.find((c) => c.type === "function");
    if (!call || call.type !== "function") {
      history.push("(no tool call; reminder: call exactly one tool)");
      continue;
    }
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      history.push(`${call.function.name}: invalid JSON arguments`);
      continue;
    }
    if (call.function.name === "request_review") {
      const unanswered = Array.isArray(args.unanswered) ? (args.unanswered as string[]) : [];
      return { status: "review", reason: `${String(args.summary ?? "Form filled.")}${unanswered.length ? ` Still needs you: ${unanswered.join("; ")}.` : ""}` };
    }
    if (call.function.name === "handoff") return { status: "handoff", reason: String(args.reason ?? "The agent needs you to take over.") };

    const action = toAction(call.function.name, args);
    if (!action) {
      history.push(`unknown tool ${call.function.name}`);
      continue;
    }
    const result = await act(page, action, { allowSubmit: false, resumePath: opts.resumePath }).catch((e: Error) => `Failed: ${e.message.split("\n")[0]}`);
    history.push(`${describe(action)} → ${result}`);
    await log("action", `${describe(action)} → ${result}`, await screenshot(page));
  }
  return { status: "review", reason: "Reached the step limit. Review what's filled and complete the rest." };
}
