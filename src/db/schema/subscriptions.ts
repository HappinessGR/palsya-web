import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Keyed on Clerk's user id directly, not a FK to users.id: there is no
// Clerk-to-DB sync webhook yet (see users.ts / dashboard/data.ts), so a
// matching `users` row is not guaranteed to exist when a patient starts a
// trial. Revisit as a FK once that sync exists.
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),

  clerkUserId: text('clerk_user_id').notNull().unique(),

  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  priceId: text('price_id').notNull(),

  // 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete_expired'
  status: text('status').notNull(),

  trialEnd: timestamp('trial_end', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
