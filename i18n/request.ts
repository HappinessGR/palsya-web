import { cookies, draftMode, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, matchAcceptLanguage, type Locale } from "./config";
import { applyOverrides, loadMessages, withFallback } from "./messages";
import { getDraftOverrides, getPublishedOverrides } from "../src/lib/site-text";
import { getActor } from "../src/lib/authz";
import { can } from "../src/lib/permissions";

const warned = new Set<Locale>();

export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchAcceptLanguage((await headers()).get("accept-language"));
}

/** True when an admin turned on "Preview drafts" (Next Draft Mode) from /admin/text. */
async function previewingDrafts(): Promise<boolean> {
  if (!(await draftMode()).isEnabled) return false;
  const actor = await getActor();
  return Boolean(actor && !actor.blocked && can(actor.role, "content:write"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const preview = await previewingDrafts();

  // Admin edits (src/lib/site-text.ts) are layered over the JSON files: English
  // first, so keys a translation lacks fall back to the edited English, then
  // the locale's own edits. Drafts only ever reach an admin in preview.
  const overrides = async (l: Locale) => [...(await getPublishedOverrides(l)), ...(preview ? await getDraftOverrides(l) : [])];
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
