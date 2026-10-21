import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { db } from "../db";
import { siteTextOverrides } from "../db/schema/site-text";
import { defaultLocale, isLocale, namespaces, type Locale } from "../../i18n/config";
import { flattenMessages, loadMessages, messageAt } from "../../i18n/messages";
import { logAction } from "./audit";
import { can } from "./permissions";
import type { Actor } from "./authz";

/**
 * Admin-editable website text. The JSON files under locales/ are the
 * defaults; site_text_overrides holds edits (see src/db/schema/site-text.ts).
 * i18n/request.ts layers published overrides over the JSON for everyone, and
 * drafts too for an admin previewing in Draft Mode.
 */

export const SITE_TEXT_TAG = "site-text";
/** Messages of the on-page editor itself, never marked as editable. */
export const EDITOR_UI_PREFIX = "backoffice.editMode.";

let keyList: Promise<string[]> | null = null;

/** Every editable message key, in a fixed order: a key's index is its id in the edit-mode markers. */
export function editableKeys(): Promise<string[]> {
  keyList ??= loadMessages(defaultLocale).then((m) => flattenMessages(m).map(([key]) => key));
  return keyList;
}

export async function editableKeyIds(): Promise<Map<string, number>> {
  return new Map((await editableKeys()).map((key, i) => [key, i]));
}
export const SITE_TEXT_MAX_LENGTH = 5000;

export type Override = { key: string; value: string };
export type SiteTextError = "forbidden" | "invalid_input" | "unknown_key" | "too_long" | "empty" | "bad_syntax" | "placeholders_changed" | "tags_changed";
export type SiteTextResult = { ok: true } | { ok: false; error: SiteTextError; detail?: string };

const allPublished = unstable_cache(
  async () =>
    db
      .select({ locale: siteTextOverrides.locale, key: siteTextOverrides.key, value: siteTextOverrides.publishedValue })
      .from(siteTextOverrides)
      .where(isNotNull(siteTextOverrides.publishedValue)),
  ["site-text-published"],
  { tags: [SITE_TEXT_TAG] },
);

/**
 * Published overrides for one locale. Never throws: a database problem (or the
 * migration not having run yet) must not take the whole site down, so the
 * site falls back to the JSON text.
 */
export async function getPublishedOverrides(locale: Locale): Promise<Override[]> {
  try {
    const rows = await allPublished();
    return rows.filter((r) => r.locale === locale && r.value !== null).map((r) => ({ key: r.key, value: r.value! }));
  } catch (err) {
    console.error("[site-text] could not load published overrides", err);
    return [];
  }
}

/** Drafts for one locale (uncached — preview only). */
export async function getDraftOverrides(locale: Locale): Promise<Override[]> {
  try {
    const rows = await db
      .select({ key: siteTextOverrides.key, value: siteTextOverrides.draftValue })
      .from(siteTextOverrides)
      .where(and(eq(siteTextOverrides.locale, locale), isNotNull(siteTextOverrides.draftValue)));
    return rows.map((r) => ({ key: r.key, value: r.value! }));
  } catch (err) {
    console.error("[site-text] could not load drafts", err);
    return [];
  }
}

export type OverrideRow = typeof siteTextOverrides.$inferSelect;

/** Every override row for the given locales, for the editor. */
export async function listOverrides(locales: Locale[]): Promise<OverrideRow[]> {
  return db.select().from(siteTextOverrides).where(inArray(siteTextOverrides.locale, locales));
}

// ---- Validation -----------------------------------------------------------

/** Argument names ({n}, {name}) and tag names (<b>, <link>) used anywhere in a parsed message. */
function tokens(elements: MessageFormatElement[], args = new Set<string>(), tags = new Set<string>()) {
  for (const el of elements) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) args.add(el.value);
    if (el.type === TYPE.select || el.type === TYPE.plural) {
      args.add(el.value);
      for (const opt of Object.values(el.options)) tokens(opt.value, args, tags);
    }
    if (el.type === TYPE.tag) {
      tags.add(el.value);
      tokens(el.children, args, tags);
    }
  }
  return { args, tags };
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/** The bundled default for a key in a locale (falling back to English), or undefined for an unknown key. */
export async function defaultText(locale: Locale, key: string): Promise<string | undefined> {
  const english = messageAt(await loadMessages(defaultLocale), key);
  if (english === undefined) return undefined;
  if (locale === defaultLocale) return english;
  return messageAt(await loadMessages(locale), key) ?? english;
}

/**
 * Checks an edit against the key's default text: it must still be a valid
 * message and use exactly the same placeholders and rich-text tags, so the
 * code that renders it keeps working.
 */
export async function validateText(locale: Locale, key: string, value: string): Promise<SiteTextResult> {
  if (!(namespaces as readonly string[]).includes(key.split(".")[0])) return { ok: false, error: "unknown_key" };
  const original = await defaultText(locale, key);
  if (original === undefined) return { ok: false, error: "unknown_key" };
  if (value.trim() === "") return { ok: false, error: "empty" };
  if (value.length > SITE_TEXT_MAX_LENGTH) return { ok: false, error: "too_long" };

  let edited;
  try {
    edited = tokens(parse(value));
  } catch (err) {
    return { ok: false, error: "bad_syntax", detail: err instanceof Error ? err.message : undefined };
  }
  const expected = tokens(parse(original));
  if (!sameSet(edited.args, expected.args)) return { ok: false, error: "placeholders_changed", detail: [...expected.args].map((a) => `{${a}}`).join(" ") };
  if (!sameSet(edited.tags, expected.tags)) return { ok: false, error: "tags_changed", detail: [...expected.tags].map((t) => `<${t}>`).join(" ") };
  return { ok: true };
}

// ---- Writes ---------------------------------------------------------------

function allowed(actor: Actor) {
  return !actor.blocked && can(actor.role, "content:write");
}

/** Makes newly published or reverted text visible straight away, not after a stale render. */
function refresh() {
  revalidateTag(SITE_TEXT_TAG, { expire: 0 });
}

export async function saveDraft(actor: Actor, locale: unknown, key: unknown, value: unknown): Promise<SiteTextResult> {
  if (!allowed(actor)) return { ok: false, error: "forbidden" };
  if (!isLocale(locale) || typeof key !== "string" || typeof value !== "string") return { ok: false, error: "invalid_input" };
  const text = value.replace(/\r\n/g, "\n");
  const check = await validateText(locale, key, text);
  if (!check.ok) return check;

  const now = new Date();
  await db
    .insert(siteTextOverrides)
    .values({ locale, key, draftValue: text, draftUpdatedBy: actor.userId, draftUpdatedAt: now })
    .onConflictDoUpdate({
      target: [siteTextOverrides.locale, siteTextOverrides.key],
      set: { draftValue: text, draftUpdatedBy: actor.userId, draftUpdatedAt: now, updatedAt: now },
    });
  await logAction(actor.userId, "site_text_draft_saved", { type: "site_text" }, { locale, key, length: text.length });
  return { ok: true };
}

/** Drops the draft; a row with nothing published left is removed entirely. */
export async function discardDraft(actor: Actor, locale: unknown, key: unknown): Promise<SiteTextResult> {
  if (!allowed(actor)) return { ok: false, error: "forbidden" };
  if (!isLocale(locale) || typeof key !== "string") return { ok: false, error: "invalid_input" };
  const where = and(eq(siteTextOverrides.locale, locale), eq(siteTextOverrides.key, key));
  const [row] = await db.select().from(siteTextOverrides).where(where);
  if (!row) return { ok: true };
  if (row.publishedValue === null) await db.delete(siteTextOverrides).where(where);
  else await db.update(siteTextOverrides).set({ draftValue: null, draftUpdatedBy: null, draftUpdatedAt: null, updatedAt: new Date() }).where(where);
  return { ok: true };
}

/** Publishes the drafts for these keys (every draft in the locale when `keys` is omitted). Returns how many went live. */
export async function publishDrafts(actor: Actor, locale: unknown, keys?: string[]): Promise<SiteTextResult & { count?: number }> {
  if (!allowed(actor)) return { ok: false, error: "forbidden" };
  if (!isLocale(locale) || (keys && keys.some((k) => typeof k !== "string"))) return { ok: false, error: "invalid_input" };
  if (keys && keys.length === 0) return { ok: true, count: 0 };

  const drafts = await db
    .select()
    .from(siteTextOverrides)
    .where(
      and(eq(siteTextOverrides.locale, locale), isNotNull(siteTextOverrides.draftValue), keys ? inArray(siteTextOverrides.key, keys) : undefined),
    );

  const now = new Date();
  let count = 0;
  for (const row of drafts) {
    // Re-validated at publish time: the JSON default may have changed in a deploy since the draft was saved.
    const check = await validateText(locale, row.key, row.draftValue!);
    if (!check.ok) return { ...check, detail: `${row.key}${check.detail ? `: ${check.detail}` : ""}` };
    await db
      .update(siteTextOverrides)
      .set({
        publishedValue: row.draftValue,
        publishedBy: actor.userId,
        publishedAt: now,
        draftValue: null,
        draftUpdatedBy: null,
        draftUpdatedAt: null,
        updatedAt: now,
      })
      .where(eq(siteTextOverrides.id, row.id));
    await logAction(actor.userId, "site_text_published", { type: "site_text" }, { locale, key: row.key, previous: row.publishedValue });
    count++;
  }
  if (count) refresh();
  return { ok: true, count };
}

/** Removes the override (draft and published), so the key shows its JSON default again. */
export async function revertToDefault(actor: Actor, locale: unknown, key: unknown): Promise<SiteTextResult> {
  if (!allowed(actor)) return { ok: false, error: "forbidden" };
  if (!isLocale(locale) || typeof key !== "string") return { ok: false, error: "invalid_input" };
  const [row] = await db
    .delete(siteTextOverrides)
    .where(and(eq(siteTextOverrides.locale, locale), eq(siteTextOverrides.key, key)))
    .returning();
  if (row) {
    await logAction(actor.userId, "site_text_reverted", { type: "site_text" }, { locale, key, previous: row.publishedValue });
    if (row.publishedValue !== null) refresh();
  }
  return { ok: true };
}

export interface EditableText {
  locale: Locale;
  key: string;
  /** The bundled text for this locale (English when the locale lacks it). */
  original: string;
  /** English as currently published, shown as a reference when editing another language. */
  english: string;
  published: string | null;
  publishedAt: Date | null;
  draft: string | null;
  draftUpdatedAt: Date | null;
  /** English was published after this language's text was last set. */
  englishChanged: boolean;
}

/** Everything the on-page editor shows for one message. Admin only. */
export async function getEditableText(actor: Actor, locale: unknown, key: unknown): Promise<EditableText | null> {
  if (!allowed(actor) || !isLocale(locale) || typeof key !== "string") return null;
  const original = await defaultText(locale, key);
  if (original === undefined) return null;
  const rows = await db
    .select()
    .from(siteTextOverrides)
    .where(and(eq(siteTextOverrides.key, key), inArray(siteTextOverrides.locale, [locale, defaultLocale])));
  const mine = rows.find((r) => r.locale === locale);
  const en = rows.find((r) => r.locale === defaultLocale);
  const englishDefault = (await defaultText(defaultLocale, key))!;
  return {
    locale,
    key,
    original,
    english: en?.publishedValue ?? englishDefault,
    published: mine?.publishedValue ?? null,
    publishedAt: mine?.publishedAt ?? null,
    draft: mine?.draftValue ?? null,
    draftUpdatedAt: mine?.draftUpdatedAt ?? null,
    englishChanged: locale !== defaultLocale && Boolean(en?.publishedAt && (!mine?.publishedAt || en.publishedAt > mine.publishedAt)),
  };
}

/** Drafts waiting in one locale (for the edit-mode bar). */
export async function countDrafts(locale: Locale): Promise<number> {
  return (await getDraftOverrides(locale)).length;
}
