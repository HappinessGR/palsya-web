import { boolean, check, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Minimal content library driving "today's session" (spec 6.1), directly
// ported from the legacy prototype's assets/js/content.js
// EXERCISES_EN/TAPING_EN/ROUTINE_EN — each item there is already tagged
// with a `stages: [n, ...]` array, which the *_stages join tables below
// translate near 1:1. English text lives directly in these rows rather
// than going through next-intl's message catalogs: this is admin-authored
// clinical content (reviewed/updated by the clinical team, eventually
// managed through the Back Office CMS), not UI chrome, and conflating the
// two would complicate that future CMS. Seeded by
// scripts/seed_content_library.mjs.

export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  // Ported verbatim from EXERCISES_EN: { region, muscle, why, reps, hold,
  // rest, steps[], cues[], watch }. Kept as jsonb rather than flattened
  // into `instructions` so /dashboard/session can render the step list,
  // cues, and timer values structurally instead of parsing prose.
  details: jsonb('details'),
  sortOrder: smallint('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exerciseStages = pgTable(
  'exercise_stages',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    stage: smallint('stage').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.stage] }),
    check('exercise_stages_stage_check', sql`${table.stage} BETWEEN 1 AND 5`),
  ],
);

export const tapingTechniques = pgTable('taping_techniques', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  // Ported verbatim from TAPING_EN: { goal, tension, wear, strips[] }.
  details: jsonb('details'),
  sortOrder: smallint('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tapingTechniqueStages = pgTable(
  'taping_technique_stages',
  {
    tapingTechniqueId: uuid('taping_technique_id')
      .notNull()
      .references(() => tapingTechniques.id, { onDelete: 'cascade' }),
    stage: smallint('stage').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tapingTechniqueId, table.stage] }),
    check('taping_technique_stages_stage_check', sql`${table.stage} BETWEEN 1 AND 5`),
  ],
);

export const routineItems = pgTable('routine_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  // Ported verbatim from ROUTINE_EN: { when, icon, items[] }.
  details: jsonb('details'),
  sortOrder: smallint('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const routineItemStages = pgTable(
  'routine_item_stages',
  {
    routineItemId: uuid('routine_item_id')
      .notNull()
      .references(() => routineItems.id, { onDelete: 'cascade' }),
    stage: smallint('stage').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.routineItemId, table.stage] }),
    check('routine_item_stages_stage_check', sql`${table.stage} BETWEEN 1 AND 5`),
  ],
);
