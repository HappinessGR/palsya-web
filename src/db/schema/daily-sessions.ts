import { boolean, date, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { comfortRatingEnum } from './enums';
import { patientProfiles } from './users';

// Daily session record (spec 6.1, 7.1 basic version). One row per patient
// per calendar date — "missed" is deliberately NOT a stored state, it's
// the absence of a row for that date, computed the same way the legacy
// prototype's store.js `recentPattern()` does (see app/dashboard/data.ts).
//
// exercisesDone completion is a jsonb id array rather than a normalized
// child table: faster to ship and matches this phase's "basic version
// only" scope. A normalized table is a reasonable later upgrade once
// per-exercise analytics are needed.
export const dailySessions = pgTable(
  'daily_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientProfileId: uuid('patient_profile_id')
      .notNull()
      .references(() => patientProfiles.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    tapingDone: boolean('taping_done').notNull().default(false),
    exercisesDone: boolean('exercises_done').notNull().default(false),
    routineDone: boolean('routine_done').notNull().default(false),
    completedExerciseIds: jsonb('completed_exercise_ids').notNull().default(sql`'[]'::jsonb`),
    minutesSpent: smallint('minutes_spent'),
    // Mirrors the legacy prototype's session.comfort field (good/tired/rushed).
    comfortRating: comfortRatingEnum('comfort_rating'),
    observationNote: text('observation_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('daily_sessions_patient_profile_id_date_idx').on(table.patientProfileId, table.date)],
);
