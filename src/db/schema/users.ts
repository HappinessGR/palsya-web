import { boolean, check, date, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userRoleEnum, userStatusEnum } from './enums';

// Mirror of Clerk, not a parallel auth system: Clerk owns credential storage, MFA
// challenge, and session lifecycle. `clerk_user_id` is the link back to Clerk's
// User object, kept in sync by Clerk webhooks (handlers are a later pass — schema
// only here). There is deliberately no `password_hash` column: Clerk never exposes
// credential hashes, so storing one here would be dead, misleading data.
// `mfa_enabled` mirrors Clerk's `twoFactorEnabled` as a local cache/reporting field.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('pending_verification'),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  // GDPR soft-delete: set on a right-to-erasure request instead of a hard DELETE,
  // so sign_in_events/activity_log rows referencing this user keep their audit
  // value. See sign_in_events/activity_log comments for the other half of this
  // trade-off (nullable user_id + ON DELETE SET NULL).
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 1:1 with users where role = 'patient'. Split into its own table (3NF) so
// patient-only fields never appear as always-null columns on clinician/admin rows.
export const patientProfiles = pgTable(
  'patient_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Nullable: often not known yet at signup, filled in during onboarding.
    onsetDate: date('onset_date'),
    phase: smallint('phase'),
    preferredLanguage: text('preferred_language').notNull().default('en'),
    consultLanguage: text('consult_language'),
    assignedClinicianId: uuid('assigned_clinician_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('patient_profiles_assigned_clinician_id_idx').on(table.assignedClinicianId),
    check('patient_profiles_phase_check', sql`${table.phase} BETWEEN 1 AND 5`),
  ],
);

// 1:1 with users where role in ('clinician', 'admin', 'superuser').
export const staffProfiles = pgTable('staff_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  institution: text('institution'),
  // Plain text, not an enum: no value set was specified, and inventing one would
  // be a guess. Easy to promote to an enum/lookup table once the real set is known.
  employmentStatus: text('employment_status').notNull(),
  // Professional registration / practice number a clinician enters at
  // sign-up. Nullable: admins have none. Checked by hand before the
  // clinician is verified (Clerk publicMetadata.clinicianVerified).
  registrationNumber: text('registration_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
