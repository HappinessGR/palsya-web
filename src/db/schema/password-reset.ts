import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// One row per issued reset link. Only a SHA-256 hash of the token is stored —
// the raw token exists only in the email — so a database leak can't be used to
// reset anyone's password. Keyed by clerk_user_id rather than users.id: Clerk
// is where the password lives, and a Clerk account may exist before its users
// row (the webhook is not configured everywhere).
//
// used_at doubles as "invalidated": issuing a new link sets it on every older
// unused row for the same user, and consuming a link sets it atomically
// (UPDATE ... WHERE used_at IS NULL AND expires_at > now() RETURNING).
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    // Language the request was made in, so the confirmation email matches it.
    locale: text('locale').notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('password_reset_tokens_clerk_user_id_idx').on(table.clerkUserId)],
);

// Append-only log of reset requests, for rate limiting (per email and per IP)
// whether or not the email belongs to an account. The email is stored as a
// SHA-256 hash: it's only ever compared, never read back.
export const passwordResetAttempts = pgTable(
  'password_reset_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    emailHash: text('email_hash').notNull(),
    ipAddress: text('ip_address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('password_reset_attempts_email_hash_created_at_idx').on(table.emailHash, table.createdAt),
    index('password_reset_attempts_ip_address_created_at_idx').on(table.ipAddress, table.createdAt),
  ],
);
