import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// Admin edits to the website's UI text. The JSON files under locales/ stay the
// defaults; a row here overrides one message (`key` is its full path, e.g.
// 'landing.hero.title') in one locale. Edits live in the database because
// Railway's filesystem is rebuilt on every deploy.
//
// A row moves draft → published: `draft_value` is only shown to admins in
// preview, `published_value` to everyone. Deleting the row reverts the text to
// the JSON default. *_by are nullable + ON DELETE SET NULL for the same
// GDPR-erasure reason as activity_log.
export const siteTextOverrides = pgTable(
  'site_text_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    locale: text('locale').notNull(),
    key: text('key').notNull(),
    draftValue: text('draft_value'),
    draftUpdatedBy: uuid('draft_updated_by').references(() => users.id, { onDelete: 'set null' }),
    draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true }),
    publishedValue: text('published_value'),
    publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('site_text_overrides_locale_key_idx').on(table.locale, table.key)],
);
