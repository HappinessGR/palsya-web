/**
 * Palsya backend schema — Postgres via Drizzle ORM, hosted on Neon.
 *
 * ROLE-SPECIFIC DATA IS SPLIT INTO SEPARATE PROFILE TABLES (3NF)
 * `users` holds only fields every role shares. Patient-only fields (onset_date,
 * phase, assigned_clinician_id, ...) live in `patient_profiles`; staff-only
 * fields (title, institution, employment_status) live in `staff_profiles`. A
 * single wide `users` table would otherwise carry 5+ always-null columns for
 * every clinician/admin row (patient fields) and vice versa — a repeating
 * pattern of nullable columns keyed off `role` is exactly what normalization
 * to 3NF rules out.
 *
 * THIS IS A MIRROR OF CLERK, NOT A PARALLEL AUTH SYSTEM
 * Clerk (@clerk/nextjs) already owns credential storage, MFA challenge, and
 * session lifecycle for this app. `users.clerk_user_id` is the link back to
 * Clerk's own user object; `email`, `mfa_enabled`, and `email_verified_at` are
 * kept in sync by Clerk webhooks (webhook handlers are a later, application-
 * layer pass — this is schema only). There is deliberately no `password_hash`
 * column anywhere: Clerk never exposes credential hashes to the app, so a
 * column for one would be dead, misleading data. `auth_methods` is kept as a
 * lookup table to classify which strategy Clerk reports for a sign-in event
 * (password, google, apple, ...), not as something the app uses to perform
 * authentication itself.
 *
 * GDPR ERASURE vs. AUDIT TRAIL INTEGRITY — a flagged trade-off
 * `users.deleted_at` is a soft-delete: a right-to-erasure request sets it
 * instead of running a hard DELETE, so the row (and its role, dates, etc.)
 * can be scrubbed of PII in place while its id keeps working as a foreign key
 * target. `sign_in_events.user_id` and `activity_log.user_id` are nullable
 * with `ON DELETE SET NULL`, and `sessions.user_id` is NOT NULL with
 * `ON DELETE CASCADE` (sessions are operational state, not the audit record
 * itself — that's what sign_in_events is for). The intent: if a hard purge
 * ever runs after some retention window, sign-in/activity log rows survive
 * with their user_id anonymized to NULL rather than being deleted (breaking
 * the audit trail) or blocking the purge (a FK violation). NEITHER an actual
 * retention/purge policy NOR the PII-scrubbing step on soft-delete is
 * implemented here — both are product decisions to make later. This schema
 * only guarantees that whichever policy you pick won't be blocked by FK
 * constraints or lose audit rows as a side effect.
 *
 * WHY sign_in_events.user_id CAN'T ALWAYS RESOLVE TO A USER
 * A failed sign-in attempt against an email that was never registered still
 * matters for rate-limiting/abuse detection, so user_id has to be nullable
 * independent of the GDPR concern above — `email_attempted` captures what was
 * typed either way.
 *
 * INDEXES
 * - Every FK column is indexed (patient_profiles.assigned_clinician_id,
 *   sign_in_events.auth_method_id, sessions.sign_in_event_id,
 *   activity_log.session_id, activity_log.action_type_id) — Postgres does not
 *   auto-index FK columns the way it does primary/unique keys.
 * - sign_in_events(user_id, created_at) and sessions(user_id, expires_at) and
 *   activity_log(user_id, created_at): these three tables are high write
 *   volume and always queried by user + date range (a user's login history, a
 *   user's active sessions, a user's activity feed).
 * - sign_in_events(ip_address, created_at): abuse/rate-limit detection queries
 *   by source IP over a time window, independent of which user_id (or lack of
 *   one) is on the row.
 * - activity_log(target_type, target_id): "what happened to this specific
 *   patient/consultation/etc." lookups, without a FK since the target table
 *   varies by target_type.
 * - Unique constraints (users.clerk_user_id, users.email,
 *   patient_profiles.user_id, staff_profiles.user_id, auth_methods.code,
 *   action_types.code) each create their own index for free.
 *
 * PHASE 1 ADDITIONS (onboarding.ts, preferences.ts, content-library.ts,
 * daily-sessions.ts)
 * assessment_responses/phase_assignments/safety_flags/consent_records are
 * ported from the legacy vanilla-JS prototype's already-validated
 * quiz.js/store.js logic (see src/lib/assessment.ts), not designed fresh.
 * consent_records is deliberately append-only (one row per grant/revoke
 * event) rather than upserted in place, for real proof-of-consent history.
 * patientProfiles.phase remains the fast-read *current* stage; every
 * insert into phase_assignments is paired with a write to it. The
 * exercises/taping_techniques/routine_items content library holds
 * plain-English rows on purpose — it is admin-authored clinical content
 * (a future Back Office CMS concern), not UI chrome, so it is not routed
 * through next-intl's message catalogs the way UI strings are.
 */

export * from './enums';
export * from './users';
export * from './auth';
export * from './activity';
export * from './subscriptions';
export * from './onboarding';
export * from './preferences';
export * from './content-library';
export * from './daily-sessions';
export * from './password-reset';
export * from './clinical-notes';
