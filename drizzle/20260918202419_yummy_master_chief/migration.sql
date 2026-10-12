CREATE TYPE "sign_in_failure_reason" AS ENUM('invalid_password', 'invalid_email', 'account_not_found', 'account_locked', 'account_suspended', 'mfa_failed', 'rate_limited');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('patient', 'clinician', 'admin', 'superuser');--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM('active', 'suspended', 'pending_verification');--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"onset_date" date,
	"phase" smallint,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"consult_language" text,
	"assigned_clinician_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_profiles_phase_check" CHECK ("phase" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"title" text NOT NULL,
	"institution" text,
	"employment_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"clerk_user_id" text NOT NULL UNIQUE,
	"email" text NOT NULL UNIQUE,
	"full_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification'::"user_status" NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_methods" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"sign_in_event_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" inet NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_in_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"email_attempted" text NOT NULL,
	"auth_method_id" smallint NOT NULL,
	"success" boolean NOT NULL,
	"failure_reason" "sign_in_failure_reason",
	"ip_address" inet NOT NULL,
	"user_agent" text,
	"device_fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "action_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" text NOT NULL UNIQUE,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"session_id" uuid,
	"action_type_id" smallint NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "patient_profiles_assigned_clinician_id_idx" ON "patient_profiles" ("assigned_clinician_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions" ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "sessions_sign_in_event_id_idx" ON "sessions" ("sign_in_event_id");--> statement-breakpoint
CREATE INDEX "sign_in_events_user_id_created_at_idx" ON "sign_in_events" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sign_in_events_ip_address_created_at_idx" ON "sign_in_events" ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "sign_in_events_auth_method_id_idx" ON "sign_in_events" ("auth_method_id");--> statement-breakpoint
CREATE INDEX "activity_log_user_id_created_at_idx" ON "activity_log" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_target_type_target_id_idx" ON "activity_log" ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "activity_log_session_id_idx" ON "activity_log" ("session_id");--> statement-breakpoint
CREATE INDEX "activity_log_action_type_id_idx" ON "activity_log" ("action_type_id");--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_assigned_clinician_id_users_id_fkey" FOREIGN KEY ("assigned_clinician_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_sign_in_event_id_sign_in_events_id_fkey" FOREIGN KEY ("sign_in_event_id") REFERENCES "sign_in_events"("id");--> statement-breakpoint
ALTER TABLE "sign_in_events" ADD CONSTRAINT "sign_in_events_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sign_in_events" ADD CONSTRAINT "sign_in_events_auth_method_id_auth_methods_id_fkey" FOREIGN KEY ("auth_method_id") REFERENCES "auth_methods"("id");--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_session_id_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_action_type_id_action_types_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "action_types"("id");