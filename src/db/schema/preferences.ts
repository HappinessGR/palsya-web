import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { textSizeEnum } from './enums';
import { patientProfiles } from './users';

// Non-clinical prefs (spec 5.4), kept as its own table rather than
// widening the already-shipped patient_profiles (which owns the clinical
// preferredLanguage/consultLanguage columns). One row per patient,
// created during onboarding's preferences step.
export const patientPreferences = pgTable('patient_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientProfileId: uuid('patient_profile_id')
    .notNull()
    .unique()
    .references(() => patientProfiles.id, { onDelete: 'cascade' }),
  remindersOn: boolean('reminders_on').notNull().default(true),
  // Stored as free-form "HH:MM" text, not a Postgres time type: these are
  // display/notification-scheduling preferences, never used in date/time
  // arithmetic, matching the legacy prototype's plain string fields.
  reminderTime: text('reminder_time'),
  secondReminderTime: text('second_reminder_time'),
  cameraMirror: boolean('camera_mirror').notNull().default(true),
  textSize: textSizeEnum('text_size').notNull().default('normal'),
  weeklySummaryEmail: boolean('weekly_summary_email').notNull().default(true),
  clinicianUpdatesEmail: boolean('clinician_updates_email').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
