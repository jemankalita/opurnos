import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  ApplicationState,
  EligibilityRules,
  Evidence,
  MatchStatus,
  OpportunityType,
  Preferences,
  Profile,
  Tailored,
  Verdict,
  VerifierReport,
} from "../schemas";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  resumeText: text("resume_text"),
  resumeFile: text("resume_file"), // base64 PDF, kept so the agent can upload it
  resumeFileName: text("resume_file_name"),
  parsed: jsonb("parsed").$type<Profile>(),
  prefs: jsonb("prefs").$type<Preferences>().notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  onboarded: boolean("onboarded").notNull().default(false),
  lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
  lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey(), // e.g. "greenhouse:stripe"
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastCount: integer("last_count").notNull().default(0),
  lastError: text("last_error"),
  status: text("status").notNull().default("idle"), // idle | ok | error
  // Only for kind "website": the page a user asked us to watch, and who added it.
  url: text("url"),
  addedBy: text("added_by").references(() => users.id, { onDelete: "cascade" }),
});

// Official pages of seasonal programs ("opens soon" watch). Only the lines about dates and
// applications are kept, so a changed hash means those changed, not the page's chrome.
export const pageWatches = pgTable("page_watches", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  hash: text("hash"),
  lines: jsonb("lines").$type<string[]>().notNull().default([]),
  added: jsonb("added").$type<string[]>().notNull().default([]), // lines that were new at the last change
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  changedAt: timestamp("changed_at", { withTimezone: true }),
  lastError: text("last_error"),
});

export const opportunities = pgTable(
  "opportunities",
  {
    id: id(),
    sourceId: text("source_id").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    applyUrl: text("apply_url"),
    ats: text("ats"), // greenhouse | lever | ashby | workday | other
    type: text("type").$type<OpportunityType>().notNull(),
    title: text("title").notNull(),
    org: text("org").notNull(),
    orgLogo: text("org_logo"),
    locations: jsonb("locations").$type<string[]>().notNull().default([]),
    remote: boolean("remote").notNull().default(false),
    deadline: timestamp("deadline", { withTimezone: true }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    comp: text("comp"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    description: text("description").notNull().default(""),
    rules: jsonb("rules").$type<EligibilityRules>(),
    rulesExtracted: boolean("rules_extracted").notNull().default(false),
    contentHash: text("content_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    firstSeen: createdAt(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opp_source_ext").on(t.sourceId, t.externalId),
    index("opp_hash").on(t.contentHash),
    index("opp_type_active").on(t.type, t.isActive),
  ],
);

export const matches = pgTable(
  "matches",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    verdict: text("verdict").$type<Verdict>().notNull(),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, number>>().notNull(),
    why: text("why").notNull(),
    evidence: jsonb("evidence").$type<Evidence[]>().notNull().default([]),
    gaps: jsonb("gaps").$type<string[]>().notNull().default([]),
    judgedBy: text("judged_by").notNull(), // model id or "rules"
    status: text("status").$type<MatchStatus>().notNull().default("new"),
    feedback: integer("feedback"), // -1 | 1
    feedbackReason: text("feedback_reason"),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.opportunityId] }), index("match_user_score").on(t.userId, t.score)],
);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    state: text("state").$type<ApplicationState>().notNull().default("drafting"),
    tailored: jsonb("tailored").$type<Tailored>(),
    verifier: jsonb("verifier").$type<VerifierReport>(),
    acceptedClaims: jsonb("accepted_claims").$type<string[]>().notNull().default([]),
    fields: jsonb("fields").$type<{ label: string; value: string }[]>().notNull().default([]),
    error: text("error"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("app_user").on(t.userId)],
);

export const runSteps = pgTable(
  "run_steps",
  {
    id: id(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    kind: text("kind").notNull(), // thought | action | screenshot | system | error
    message: text("message").notNull(),
    screenshot: text("screenshot"), // base64 jpeg
    createdAt: createdAt(),
  },
  (t) => [index("step_app_seq").on(t.applicationId, t.seq)],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: id(),
    userId: text("user_id"),
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costUsd: doublePrecision("cost_usd").notNull().default(0),
    ms: integer("ms").notNull().default(0),
    ok: boolean("ok").notNull().default(true),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("run_user_time").on(t.userId, t.createdAt)],
);

export const usedTokens = pgTable("used_tokens", {
  jti: text("jti").primaryKey(),
  usedAt: createdAt(),
});

export const outbox = pgTable("outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  provider: text("provider").notNull(), // resend | local
  providerId: text("provider_id"),
  createdAt: createdAt(),
});

// Razorpay subscription per user (one Pro plan). Webhooks keep `status` and the period current.
export const subscriptions = pgTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("pro"),
  razorpaySubscriptionId: text("razorpay_subscription_id").notNull().unique(),
  // Razorpay's states: created | authenticated | active | pending | halted | cancelled | completed | expired
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtCycleEnd: boolean("cancel_at_cycle_end").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
