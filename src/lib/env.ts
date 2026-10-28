import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Meta Model API (OpenAI-compatible). Empty key => demo mode with heuristic fallbacks.
  MODEL_API_KEY: z.string().optional(),
  MODEL_BASE_URL: z.string().url().default("https://api.meta.ai/v1"),
  MODEL_DEFAULT: z.string().default("muse-spark-1.3"),
  // Contributor mode is cheaper but may be used for training: public opportunity data only.
  MODEL_PUBLIC: z.string().default("muse-spark-1.3-contributor"),
  MODEL_AGENT: z.string().default("muse-wonder-1.0"),
  MODEL_TRANSCRIBE: z.string().default("muse-voice-transcribe-1.0"),

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

  DAILY_LLM_BUDGET_USD: z.coerce.number().positive().default(0.5),
  DAILY_APPLY_CAP: z.coerce.number().int().positive().default(10),
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
