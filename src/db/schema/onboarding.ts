import { boolean, check, index, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  consentTypeEnum,
  phaseAssignmentSourceEnum,
  phaseConfidenceEnum,
  safetyFlagLevelEnum,
} from './enums';
import { patientProfiles, users } from './users';

// Raw quiz submission (spec 5.2), ported from the legacy prototype's
// quiz.js `Q.questions` answer-object shape. Stored as jsonb rather than
// one column per question: the question set is clinical content that will
// keep evolving, and nothing in Phase 1 needs per-answer relational
// querying — phase_assignments.reasons is the queryable, structured output
// derived from this blob, not the blob itself.
//
// Multiple rows per patient are allowed (a future re-assessment feature);
// "most recent by submitted_at" is the current state.
export const assessmentResponses = pgTable(
  'assessment_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientProfileId: uuid('patient_profile_id')
      .notNull()
      .references(() => patientProfiles.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('assessment_responses_patient_profile_id_submitted_at_idx').on(
      table.patientProfileId,
      table.submittedAt,
    ),
  ],
);

// Safety-flag audit trail (spec 5.2's Q.flags()) behind a specific
// assessment submission — what was shown, and whether/when the patient
// used the "continue anyway" override for an urgent/wait-level flag.
// flag_id mirrors the legacy prototype's stable ids (e.g. 'limb', 'eye',
// 'rash', 'undiagnosed', 'tooEarly', 'late', 'bilateral', 'noEyeCare',
// 'estim', 'gum') so the ported algorithm's output can be traced 1:1.
export const safetyFlags = pgTable(
  'safety_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assessmentResponseId: uuid('assessment_response_id')
      .notNull()
      .references(() => assessmentResponses.id, { onDelete: 'cascade' }),
    level: safetyFlagLevelEnum('level').notNull(),
    flagId: text('flag_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    overriddenAt: timestamp('overridden_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('safety_flags_assessment_response_id_idx').on(table.assessmentResponseId)],
);

// History + audit of phase assignment (spec 5.3). patientProfiles.phase
// stays the fast-read *current* value; every write to it happens
// alongside an insert here (see src/lib/assessment.ts). The Back-Office
// clinician-override UI is out of scope for Phase 1 — this table only
// needs to exist, be written to by the assessment algorithm, and support
// the patient-facing "pending review" state (needs_review = true).
export const phaseAssignments = pgTable(
  'phase_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientProfileId: uuid('patient_profile_id')
      .notNull()
      .references(() => patientProfiles.id, { onDelete: 'cascade' }),
    assessmentResponseId: uuid('assessment_response_id').references(() => assessmentResponses.id, {
      onDelete: 'set null',
    }),
    stage: smallint('stage').notNull(),
    source: phaseAssignmentSourceEnum('source').notNull(),
    confidence: phaseConfidenceEnum('confidence').notNull(),
    needsReview: boolean('needs_review').notNull().default(false),
    // Plain-language reasons shown on the stage-result screen, ported
    // verbatim from Q.assign()'s `reasons`/`reviewWhy` arrays.
    reasons: jsonb('reasons').notNull().default(sql`'[]'::jsonb`),
    reviewedByStaffId: uuid('reviewed_by_staff_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('phase_assignments_patient_profile_id_assigned_at_idx').on(table.patientProfileId, table.assignedAt),
    index('phase_assignments_assessment_response_id_idx').on(table.assessmentResponseId),
    index('phase_assignments_reviewed_by_staff_id_idx').on(table.reviewedByStaffId),
    check('phase_assignments_stage_check', sql`${table.stage} BETWEEN 1 AND 5`),
  ],
);

// Granular, versioned consent (spec 5.5) — append-only, one row per
// grant/revoke EVENT rather than one row upserted in place, so there is a
// real proof-of-consent history rather than only a current flag. Effective
// consent for a (user, consentType) pair is the most recent row by
// created_at. `data_processing` and `terms_of_service` are required to
// complete onboarding; the rest are optional and default unchecked.
export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: consentTypeEnum('consent_type').notNull(),
    policyVersion: text('policy_version').notNull(),
    granted: boolean('granted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('consent_records_user_id_consent_type_created_at_idx').on(
      table.userId,
      table.consentType,
      table.createdAt,
    ),
  ],
);
