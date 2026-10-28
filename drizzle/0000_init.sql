CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"ms" integer DEFAULT 0 NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"state" text DEFAULT 'drafting' NOT NULL,
	"tailored" jsonb,
	"verifier" jsonb,
	"accepted_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"user_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"verdict" text NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"why" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"judged_by" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"feedback" integer,
	"feedback_reason" text,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_user_id_opportunity_id_pk" PRIMARY KEY("user_id","opportunity_id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"apply_url" text,
	"ats" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"org" text NOT NULL,
	"org_logo" text,
	"locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"deadline" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"comp" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"rules" jsonb,
	"rules_extracted" boolean DEFAULT false NOT NULL,
	"content_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"resume_text" text,
	"resume_file" text,
	"resume_file_name" text,
	"parsed" jsonb,
	"prefs" jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"last_matched_at" timestamp with time zone,
	"last_digest_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"seq" integer NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"screenshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"status" text DEFAULT 'idle' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "used_tokens" (
	"jti" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_steps" ADD CONSTRAINT "run_steps_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_user_time" ON "agent_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_user" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_user_score" ON "matches" USING btree ("user_id","score");--> statement-breakpoint
CREATE UNIQUE INDEX "opp_source_ext" ON "opportunities" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "opp_hash" ON "opportunities" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "opp_type_active" ON "opportunities" USING btree ("type","is_active");--> statement-breakpoint
CREATE INDEX "step_app_seq" ON "run_steps" USING btree ("application_id","seq");