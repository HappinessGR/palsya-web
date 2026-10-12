CREATE TABLE "password_reset_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email_hash" text NOT NULL,
	"ip_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"clerk_user_id" text NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinician_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_profile_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "password_reset_attempts_email_hash_created_at_idx" ON "password_reset_attempts" ("email_hash","created_at");--> statement-breakpoint
CREATE INDEX "password_reset_attempts_ip_address_created_at_idx" ON "password_reset_attempts" ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_clerk_user_id_idx" ON "password_reset_tokens" ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "clinician_notes_patient_profile_id_created_at_idx" ON "clinician_notes" ("patient_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "clinician_notes_author_id_idx" ON "clinician_notes" ("author_id");--> statement-breakpoint
ALTER TABLE "clinician_notes" ADD CONSTRAINT "clinician_notes_patient_profile_id_patient_profiles_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinician_notes" ADD CONSTRAINT "clinician_notes_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
-- Audit action codes written by src/lib/audit.ts (data, not schema).
INSERT INTO "action_types" ("code", "description") VALUES
	('role_changed', 'Changed a user''s role'),
	('user_invited', 'Invited a clinician or admin'),
	('invitation_revoked', 'Revoked a pending invitation'),
	('patient_assigned', 'Assigned or unassigned a patient''s clinician'),
	('user_deactivated', 'Deactivated a user account'),
	('user_reactivated', 'Reactivated a user account'),
	('patient_stage_changed', 'Changed a patient''s recovery stage'),
	('clinician_note_added', 'Added a clinician note to a patient record'),
	('password_reset_requested', 'Requested a password reset link'),
	('password_reset_completed', 'Reset a password with an emailed link'),
	('user_demoted_self_registered', 'Demoted a self-registered clinician to patient')
ON CONFLICT ("code") DO NOTHING;
