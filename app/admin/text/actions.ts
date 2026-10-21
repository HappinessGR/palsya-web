"use server";

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeAction } from "../../../src/lib/authz";
import { listOverrides, publishDrafts, revertToDefault, discardDraft, saveDraft, type SiteTextResult } from "../../../src/lib/site-text";
import { isLocale, namespaces } from "../../../i18n/config";
import { prefixesFor, previewPath, underAny } from "./shared";

/**
 * Server actions behind /admin/text. Same shape as app/admin/users/actions.ts:
 * check the permission, call src/lib/site-text.ts (which validates and writes
 * the audit log), then redirect back with ?result= / ?error= so the page can
 * show the outcome without client state.
 */

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

function back(form: FormData, outcome: Record<string, string>, anchor?: string): never {
  const qs = new URLSearchParams();
  for (const name of ["ns", "locale", "q", "changed"]) if (str(form, name)) qs.set(name, str(form, name));
  for (const [k, v] of Object.entries(outcome)) qs.set(k, v);
  redirect(`/admin/text?${qs.toString()}${anchor ? `#${anchor}` : ""}`);
}

const fail = (res: Extract<SiteTextResult, { ok: false }>) => ({ error: res.error, ...(res.detail ? { detail: res.detail.slice(0, 300) } : {}) });

/** One row's buttons: save draft, publish, discard draft or revert to default. */
export async function textAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) back(form, { error: "forbidden" });

  const intent = str(form, "intent");
  const locale = str(form, "locale");
  const key = str(form, "key");
  const anchor = `k-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`;

  if (intent === "save" || intent === "publish") {
    const value = str(form, "value");
    const saved = await saveDraft(auth.actor, locale, key, value);
    if (!saved.ok) back(form, fail(saved), anchor);
    if (intent === "save") back(form, { result: "saved" }, anchor);
    const published = await publishDrafts(auth.actor, locale, [key]);
    back(form, published.ok ? { result: "published" } : fail(published), anchor);
  }
  if (intent === "discard") {
    const res = await discardDraft(auth.actor, locale, key);
    back(form, res.ok ? { result: "discarded" } : fail(res), anchor);
  }
  if (intent === "revert") {
    const res = await revertToDefault(auth.actor, locale, key);
    back(form, res.ok ? { result: "reverted" } : fail(res), anchor);
  }
  back(form, { error: "invalid_input" });
}

/** "Publish all drafts on this page": every draft under the selected namespace and language. */
export async function publishPageAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) back(form, { error: "forbidden" });

  const locale = str(form, "locale");
  const ns = str(form, "ns");
  const prefixes = prefixesFor(ns, namespaces);
  if (!isLocale(locale) || !prefixes) back(form, { error: "invalid_input" });

  const keys = (await listOverrides([locale]))
    .filter((r) => r.draftValue !== null && underAny(r.key, prefixes))
    .map((r) => r.key);
  const res = await publishDrafts(auth.actor, locale, keys);
  back(form, res.ok ? { result: "publishedAll", count: String(res.count ?? 0) } : fail(res));
}

/** Turns on Next Draft Mode (an admin-only cookie) and opens the page that uses this namespace. */
export async function previewAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("content:write");
  if (!auth.ok) back(form, { error: "forbidden" });
  (await draftMode()).enable();
  redirect(previewPath(str(form, "ns")));
}

export async function exitPreviewAction(): Promise<void> {
  (await draftMode()).disable();
  redirect("/admin/text");
}
