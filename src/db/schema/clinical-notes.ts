import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { patientProfiles, users } from './users';

// Free-text notes a clinician writes about an assigned patient. Append-only
// (no edit/delete endpoint), so the record of what was advised is preserved.
// author_id is nullable + ON DELETE SET NULL for the same GDPR-erasure reason
// as activity_log; the note itself belongs to the patient's record.
export const clinicianNotes = pgTable(
  'clinician_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientProfileId: uuid('patient_profile_id')
      .notNull()
      .references(() => patientProfiles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('clinician_notes_patient_profile_id_created_at_idx').on(table.patientProfileId, table.createdAt),
    index('clinician_notes_author_id_idx').on(table.authorId),
  ],
);
