import { cookies, draftMode, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, matchAcceptLanguage, type Locale } from "./config";
import { applyOverrides, loadMessages, mapStrings, withFallback } from "./messages";
import { EDITOR_UI_PREFIX, editableKeyIds, getDraftOverrides, getPublishedOverrides } from "../src/lib/site-text";
import { encodeMarker } from "../src/lib/site-text-markers";
import { getActor } from "../src/lib/authz";
import { can } from "../src/lib/permissions";

const warned = new Set<Locale>();

export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchAcceptLanguage((await headers()).get("accept-language"));
}

/** True when an admin turned on on-page edit mode (Next Draft Mode, see app/components/edit-mode). */
export async function isEditing(): Promise<boolean> {
  if (!(await draftMode()).isEnabled) return false;
  const actor = await getActor();
  return Boolean(actor && !actor.blocked && can(actor.role, "content:write"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const editing = await isEditing();

  // Admin edits (src/lib/site-text.ts) are layered over the JSON files: English
  // first, so keys a translation lacks fall back to the edited English, then
  // the locale's own edits. Drafts only ever reach an admin in edit mode.
  const overrides = async (l: Locale) => [...(await getPublishedOverrides(l)), ...(editing ? await getDraftOverrides(l) : [])];
  const english = applyOverrides(await loadMessages(defaultLocale), await overrides(defaultLocale));
  let messages = english;
  if (locale !== defaultLocale) {
    const missing: string[] = [];
    messages = applyOverrides(withFallback(english, await loadMessages(locale), missing), await overrides(locale));
    if (missing.length && process.env.NODE_ENV !== "production" && !warned.has(locale)) {
      warned.add(locale);
      console.warn(`[i18n] ${missing.length} key(s) missing in "${locale}", using English: ${missing.slice(0, 20).join(", ")}`);
    }
  }

  if (editing) {
    // Tag each message with an invisible marker so the page can tell which
    // text came from which key (src/lib/site-text-markers.ts). The editor's
    // own labels stay unmarked.
    const ids = await editableKeyIds();
    messages = mapStrings(messages, (key, value) => {
      const id = ids.get(key);
      return id === undefined || key.startsWith(EDITOR_UI_PREFIX) ? value : value + encodeMarker(id);
    });
  }

  return {
    locale,
    messages,
    timeZone: "Europe/Lisbon",
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.warn(`[i18n] ${error.message}`);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
