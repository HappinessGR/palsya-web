CREATE TABLE "site_text_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"locale" text NOT NULL,
	"key" text NOT NULL,
	"draft_value" text,
	"draft_updated_by" uuid,
	"draft_updated_at" timestamp with time zone,
	"published_value" text,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "site_text_overrides_locale_key_idx" ON "site_text_overrides" ("locale","key");--> statement-breakpoint
ALTER TABLE "site_text_overrides" ADD CONSTRAINT "site_text_overrides_draft_updated_by_users_id_fkey" FOREIGN KEY ("draft_updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "site_text_overrides" ADD CONSTRAINT "site_text_overrides_published_by_users_id_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
INSERT INTO "action_types" ("code", "description") VALUES
	('site_text_draft_saved', 'Saved a draft of website text'),
	('site_text_published', 'Published website text'),
	('site_text_reverted', 'Reverted website text to its default')
ON CONFLICT ("code") DO NOTHING;
