import { pgEnum } from 'drizzle-orm/pg-core';

// App-owned role. Clerk has no concept of this — it's assigned by an admin/superuser.
export const userRoleEnum = pgEnum('user_role', ['patient', 'clinician', 'admin', 'superuser']);

// App-owned account state, independent of Clerk's own ban/lock state.
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'pending_verification']);

// A real Postgres enum (unlike auth_methods/action_types, which are lookup tables):
// this is a small, security-domain-specific set that doesn't need runtime/admin
// extensibility the way sign-in providers or trackable actions do.
export const signInFailureReasonEnum = pgEnum('sign_in_failure_reason', [
  'invalid_password',
  'invalid_email',
  'account_not_found',
  'account_locked',
  'account_suspended',
  'mfa_failed',
  'rate_limited',
]);

// Spec 5.3 phase-assignment provenance: which process produced this
// phase_assignments row. 'assessment' = the onboarding algorithm;
// 'clinician_override' and 'progress_adjustment' are Back Office / later-
// phase writers, included now so the column never needs a migration to add
// them.
export const phaseAssignmentSourceEnum = pgEnum('phase_assignment_source', [
  'assessment',
  'clinician_override',
  'progress_adjustment',
]);

export const phaseConfidenceEnum = pgEnum('phase_confidence', ['high', 'medium', 'low']);

// Spec 5.2 safety flags (Q.flags() in the legacy prototype). A small, fixed
// clinical-severity ladder, not a growing lookup table.
export const safetyFlagLevelEnum = pgEnum('safety_flag_level', ['urgent', 'wait', 'review', 'action']);

// Spec 5.5 granular consent. `photo_storage_analysis` is collected during
// Phase 1 onboarding even though the scanner feature it gates ships in a
// later phase, so patients aren't asked twice.
export const consentTypeEnum = pgEnum('consent_type', [
  'data_processing',
  'photo_storage_analysis',
  'photo_keep',
  'clinician_share',
  'research_opt_in',
  'marketing',
  'terms_of_service',
]);

// Spec 5.4 preferences.
export const textSizeEnum = pgEnum('text_size', ['normal', 'large', 'xl']);

// Ported from the legacy prototype's session.comfort field (good/tired/
// rushed) — a small, fixed set of self-reported states, not a growing one.
export const comfortRatingEnum = pgEnum('comfort_rating', ['good', 'tired', 'rushed']);
