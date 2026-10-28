import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // OpenAI (or any OpenAI-compatible endpoint). Empty key => rules-only mode with heuristic fallbacks.
  MODEL_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MODEL_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  // Reading resumes, judging eligibility, tailoring, verifying, referrals and web search.
  MODEL_DEFAULT: z.string().default("gpt-6.1-terra"),
  // High-volume rule extraction from public listings; no user data is ever sent with it.
  MODEL_PUBLIC: z.string().default("gpt-6-luna"),
  // The browser agent that fills application forms (vision + tools).
  MODEL_AGENT: z.string().default("gpt-6.1-sol"),

  // Postgres in production (Supabase/Neon). Empty => embedded PGlite at DATA_DIR.
  DATABASE_URL: z.string().optional(),
  DATA_DIR: z.string().default(".data"),

  AUTH_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Opurnos <radar@opurnos.app>"),

  // Remote apply worker. Empty => the agent runs inside the app process.
  APPLY_WORKER_URL: z.string().url().optional(),
  APPLY_WORKER_SECRET: z.string().optional(),
  // "chrome" uses the locally installed Google Chrome; set BROWSER_EXECUTABLE in Docker.
  BROWSER_CHANNEL: z.string().default("chrome"),
  BROWSER_EXECUTABLE: z.string().optional(),
  BROWSER_HEADLESS: z.enum(["true", "false"]).default("true"),

  // Billing (Razorpay subscriptions). Empty keys => billing is off and every account gets Pro (self-hosting, development).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PRO_PLAN_ID: z.string().optional(),
  PRO_PRICE_INR: z.coerce.number().int().positive().default(199),

  // Per-plan guardrails: daily AI spend per account (USD) and browser applications per day.
  FREE_DAILY_AI_USD: z.coerce.number().nonnegative().default(0.05),
  PRO_DAILY_AI_USD: z.coerce.number().positive().default(0.5),
  PRO_DAILY_APPLY_CAP: z.coerce.number().int().positive().default(10),

  // Shown on the legal and contact pages (payment providers require them).
  COMPANY_NAME: z.string().default("Opurnos"),
  SUPPORT_EMAIL: z.string().default("support@opurnos.app"),
  COMPANY_ADDRESS: z.string().optional(),
  GRIEVANCE_OFFICER: z.string().optional(),
});

const blankToUndefined = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

const parsed = EnvSchema.safeParse(blankToUndefined);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

const DEV_AUTH_SECRET = "dev-only-secret-change-me-in-production-0123456789";

export const env = {
  ...parsed.data,
  MODEL_API_KEY: parsed.data.MODEL_API_KEY ?? parsed.data.OPENAI_API_KEY,
  AUTH_SECRET: parsed.data.AUTH_SECRET ?? DEV_AUTH_SECRET,
};

/** Checked when a token is signed or verified, so `next build` works without runtime secrets. */
export function authSecret(): string {
  if (env.NODE_ENV === "production" && env.AUTH_SECRET === DEV_AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required in production (32+ chars).");
  }
  return env.AUTH_SECRET;
}

export const isDemoMode = !env.MODEL_API_KEY;
export const isDev = env.NODE_ENV !== "production";
export const isBillingEnabled = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_PRO_PLAN_ID);
