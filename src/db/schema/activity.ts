import { index, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { sessions } from './auth';

// Lookup table, not a hardcoded enum: the set of trackable actions
// (view_patient_record, adjust_programme, suspend_clinician, export_data, ...)
// will keep growing as features ship.
export const actionTypes = pgTable('action_types', {
  id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Append-only log of what a signed-in user did. Same nullable-user_id +
// ON DELETE SET NULL pattern as sign_in_events, and for the same reason: this is
// audit trail that must survive a GDPR erasure hard-purge, anonymized rather
// than deleted. updated_at is present only for schema consistency (every table
// gets one) — it will always equal created_at since these rows are append-only.
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    actionTypeId: smallint('action_type_id')
      .notNull()
      .references(() => actionTypes.id),
    // What kind of thing was acted on, e.g. 'patient' | 'clinician_account' |
    // 'consultation'. No FK on target_id since the target table varies by
    // target_type — indexed instead.
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activity_log_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('activity_log_target_type_target_id_idx').on(table.targetType, table.targetId),
    index('activity_log_session_id_idx').on(table.sessionId),
    index('activity_log_action_type_id_idx').on(table.actionTypeId),
  ],
);
