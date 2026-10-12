CREATE TYPE "comfort_rating" AS ENUM('good', 'tired', 'rushed');--> statement-breakpoint
CREATE TYPE "consent_type" AS ENUM('data_processing', 'photo_storage_analysis', 'photo_keep', 'clinician_share', 'research_opt_in', 'marketing', 'terms_of_service');--> statement-breakpoint
CREATE TYPE "phase_assignment_source" AS ENUM('assessment', 'clinician_override', 'progress_adjustment');--> statement-breakpoint
CREATE TYPE "phase_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "safety_flag_level" AS ENUM('urgent', 'wait', 'review', 'action');--> statement-breakpoint
CREATE TYPE "text_size" AS ENUM('normal', 'large', 'xl');--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_profile_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"policy_version" text NOT NULL,
	"granted" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phase_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_profile_id" uuid NOT NULL,
	"assessment_response_id" uuid,
	"stage" smallint NOT NULL,
	"source" "phase_assignment_source" NOT NULL,
	"confidence" "phase_confidence" NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"reasons" jsonb DEFAULT '[]' NOT NULL,
	"reviewed_by_staff_id" uuid,
	"reviewed_at" timestamp with time zone,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phase_assignments_stage_check" CHECK ("stage" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "safety_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assessment_response_id" uuid NOT NULL,
	"level" "safety_flag_level" NOT NULL,
	"flag_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"overridden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_profile_id" uuid NOT NULL UNIQUE,
	"reminders_on" boolean DEFAULT true NOT NULL,
	"reminder_time" text,
	"second_reminder_time" text,
	"camera_mirror" boolean DEFAULT true NOT NULL,
	"text_size" "text_size" DEFAULT 'normal'::"text_size" NOT NULL,
	"weekly_summary_email" boolean DEFAULT true NOT NULL,
	"clinician_updates_email" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_stages" (
	"exercise_id" uuid,
	"stage" smallint,
	CONSTRAINT "exercise_stages_pkey" PRIMARY KEY("exercise_id","stage"),
	CONSTRAINT "exercise_stages_stage_check" CHECK ("stage" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_item_stages" (
	"routine_item_id" uuid,
	"stage" smallint,
	CONSTRAINT "routine_item_stages_pkey" PRIMARY KEY("routine_item_id","stage"),
	CONSTRAINT "routine_item_stages_stage_check" CHECK ("stage" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "routine_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taping_technique_stages" (
	"taping_technique_id" uuid,
	"stage" smallint,
	CONSTRAINT "taping_technique_stages_pkey" PRIMARY KEY("taping_technique_id","stage"),
	CONSTRAINT "taping_technique_stages_stage_check" CHECK ("stage" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "taping_techniques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_profile_id" uuid NOT NULL,
	"date" date NOT NULL,
	"taping_done" boolean DEFAULT false NOT NULL,
	"exercises_done" boolean DEFAULT false NOT NULL,
	"routine_done" boolean DEFAULT false NOT NULL,
	"completed_exercise_ids" jsonb DEFAULT '[]' NOT NULL,
	"minutes_spent" smallint,
	"comfort_rating" "comfort_rating",
	"observation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "assessment_responses_patient_profile_id_submitted_at_idx" ON "assessment_responses" ("patient_profile_id","submitted_at");--> statement-breakpoint
CREATE INDEX "consent_records_user_id_consent_type_created_at_idx" ON "consent_records" ("user_id","consent_type","created_at");--> statement-breakpoint
CREATE INDEX "phase_assignments_patient_profile_id_assigned_at_idx" ON "phase_assignments" ("patient_profile_id","assigned_at");--> statement-breakpoint
CREATE INDEX "phase_assignments_assessment_response_id_idx" ON "phase_assignments" ("assessment_response_id");--> statement-breakpoint
CREATE INDEX "phase_assignments_reviewed_by_staff_id_idx" ON "phase_assignments" ("reviewed_by_staff_id");--> statement-breakpoint
CREATE INDEX "safety_flags_assessment_response_id_idx" ON "safety_flags" ("assessment_response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_sessions_patient_profile_id_date_idx" ON "daily_sessions" ("patient_profile_id","date");--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_OM55rvjMKqdi_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_patient_profile_id_patient_profiles_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_2A7nq6JZ7NlJ_fkey" FOREIGN KEY ("assessment_response_id") REFERENCES "assessment_responses"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "phase_assignments" ADD CONSTRAINT "phase_assignments_reviewed_by_staff_id_users_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "safety_flags" ADD CONSTRAINT "safety_flags_qIA0XYoJGpcX_fkey" FOREIGN KEY ("assessment_response_id") REFERENCES "assessment_responses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "patient_preferences" ADD CONSTRAINT "patient_preferences_patient_profile_id_patient_profiles_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_stages" ADD CONSTRAINT "exercise_stages_exercise_id_exercises_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "routine_item_stages" ADD CONSTRAINT "routine_item_stages_routine_item_id_routine_items_id_fkey" FOREIGN KEY ("routine_item_id") REFERENCES "routine_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "taping_technique_stages" ADD CONSTRAINT "taping_technique_stages_cfHoQHm0bCst_fkey" FOREIGN KEY ("taping_technique_id") REFERENCES "taping_techniques"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_patient_profile_id_patient_profiles_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE;