CREATE TABLE "page_watches" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"hash" text,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"added" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone,
	"changed_at" timestamp with time zone,
	"last_error" text
);
