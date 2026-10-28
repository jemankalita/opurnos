ALTER TABLE "sources" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "added_by" text;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;