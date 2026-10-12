import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { defaultLocale, isLocale, LOCALE_COOKIE, matchAcceptLanguage, namespaces, type Locale } from "./config";

async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      // A namespace file not yet translated for this locale falls back to English key by key.
      const messages = await import(`../locales/${locale}/${ns}.json`).then((m) => m.default).catch(() => ({}));
      return [ns, messages] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Deep-merges `override` onto `base`, so a key missing from a translation
 * falls back to English. Missing keys are collected so development can warn.
 */
function withFallback(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
  missing: string[],
  path = "",
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const [key, baseValue] of Object.entries(base)) {
    const value = override?.[key];
    const keyPath = path ? `${path}.${key}` : key;
    if (value === undefined) {
      missing.push(keyPath);
      out[key] = baseValue;
    } else if (baseValue && typeof baseValue === "object" && value && typeof value === "object") {
      out[key] = withFallback(baseValue as AbstractIntlMessages, value as AbstractIntlMessages, missing, keyPath);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const warned = new Set<Locale>();

export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchAcceptLanguage((await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const english = await loadMessages(defaultLocale);
  let messages = english;
  if (locale !== defaultLocale) {
    const missing: string[] = [];
    messages = withFallback(english, await loadMessages(locale), missing);
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
