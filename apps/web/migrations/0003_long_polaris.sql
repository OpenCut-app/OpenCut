CREATE TABLE "export_waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "export_waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "export_waitlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "waitlist" CASCADE;