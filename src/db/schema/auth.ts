import { boolean, index, inet, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { signInFailureReasonEnum } from './enums';
import { users } from './users';

// Lookup table, not a hardcoded enum: the set of sign-in strategies (password,
// google, apple, ...) will grow as more SSO providers are added. Classifies the
// strategy Clerk reports for a sign-in event — the app never performs the
// authentication itself, Clerk does.
export const authMethods = pgTable('auth_methods', {
  id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Append-only log, one row per sign-in ATTEMPT (success or failure).
//
// Intended ingestion: Clerk webhooks cover successful events (session.created
// etc.), but Clerk does not webhook failed sign-in attempts — those aren't a
// Clerk "resource" event. Fully populating success=false rows will need a thin
// app-side capture point wrapping Clerk's client-side sign-in attempt calls, in
// a later pass (see plan non-goals — this pass is schema only).
//
// user_id is nullable + ON DELETE SET NULL: a failed attempt on a non-existent
// email must still be logged for rate-limiting/abuse detection, so it can't
// always resolve to a real user. This is also the anonymization point for GDPR
// erasure — on a hard purge after the retention window, these rows survive with
// user_id nulled out rather than being deleted or blocking the purge. The exact
// retention/purge policy is not implemented here; that's a product decision for
// later, flagged deliberately rather than assumed.
export const signInEvents = pgTable(
  'sign_in_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    emailAttempted: text('email_attempted').notNull(),
    authMethodId: smallint('auth_method_id')
      .notNull()
      .references(() => authMethods.id),
    success: boolean('success').notNull(),
    failureReason: signInFailureReasonEnum('failure_reason'),
    ipAddress: inet('ip_address').notNull(),
    userAgent: text('user_agent'),
    deviceFingerprint: text('device_fingerprint'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sign_in_events_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('sign_in_events_ip_address_created_at_idx').on(table.ipAddress, table.createdAt),
    index('sign_in_events_auth_method_id_idx').on(table.authMethodId),
  ],
);

// Active/past authenticated sessions, separate from the sign-in event that
// created them (a session outlives the login moment).
//
// user_id is NOT NULL + ON DELETE CASCADE here (unlike sign_in_events/
// activity_log): a session only exists because a real user authenticated, and
// the audit record of "this session existed" is separately preserved via its
// linked sign_in_events row (which does use the nullable+SET NULL pattern).
// sign_in_event_id has no special ON DELETE — sign_in_events rows are
// append-only and never deleted, so the FK target always exists.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    signInEventId: uuid('sign_in_event_id')
      .notNull()
      .references(() => signInEvents.id),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: inet('ip_address').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_user_id_expires_at_idx').on(table.userId, table.expiresAt),
    index('sessions_sign_in_event_id_idx').on(table.signInEventId),
  ],
);
