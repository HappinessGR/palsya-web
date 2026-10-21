"use server";

import { draftMode } from "next/headers";
import { authorizeAction } from "../../../src/lib/authz";
import {
  discardDraft,
  getEditableText,
  publishDrafts,
  revertToDefault,
  saveDraft,
  type EditableText,
  type SiteTextError,
} from "../../../src/lib/site-text";
import { resolveLocale } from "../../../i18n/request";

/**
 * Server actions behind on-page text editing (EditMode.tsx). Each checks the
 * content:write permission; src/lib/site-text.ts validates and writes the
 * audit log. They return results instead of redirecting, and the client calls
 * router.refresh() so the page re-renders with the new text.
 */

export type EditResult = { ok: true; text: EditableText | null; count?: number } | { ok: false; error: SiteTextError | "not_signed_in"; detail?: string };

/** Turns edit mode on (Next Draft Mode: admins then see drafts plus edit markers). */
export async function enterEditMode(): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  (await draftMode()).enable();
  return { ok: true, text: null };
}

export async function exitEditMode(): Promise<void> {
  (await draftMode()).disable();
}

/** The text behind one message key, in the language the admin is viewing the site in. */
export async function loadText(key: string): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  const text = await getEditableText(auth.actor, await resolveLocale(), key);
  return text ? { ok: true, text } : { ok: false, error: "unknown_key" };
}

/** Save as draft, or save and publish in one go. */
export async function saveText(key: string, value: string, publish: boolean): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  const locale = await resolveLocale();

  const saved = await saveDraft(auth.actor, locale, key, value);
  if (!saved.ok) return saved;
  if (publish) {
    const published = await publishDrafts(auth.actor, locale, [key]);
    if (!published.ok) return published;
  }
  return { ok: true, text: await getEditableText(auth.actor, locale, key) };
}

export async function discardText(key: string): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  const locale = await resolveLocale();
  const res = await discardDraft(auth.actor, locale, key);
  if (!res.ok) return res;
  return { ok: true, text: await getEditableText(auth.actor, locale, key) };
}

export async function revertText(key: string): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  const locale = await resolveLocale();
  const res = await revertToDefault(auth.actor, locale, key);
  if (!res.ok) return res;
  return { ok: true, text: await getEditableText(auth.actor, locale, key) };
}

/** "Publish all": every draft in the language the admin is viewing. */
export async function publishAll(): Promise<EditResult> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) return { ok: false, error: auth.error };
  const res = await publishDrafts(auth.actor, await resolveLocale());
  return res.ok ? { ok: true, text: null, count: res.count ?? 0 } : res;
}
