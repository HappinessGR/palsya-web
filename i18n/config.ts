/**
 * Supported UI languages. The locale is not part of the URL: it lives in the
 * `locale` cookie (read on the server by i18n/request.ts) and is mirrored to
 * localStorage by the language switcher. First visits fall back to the
 * browser's Accept-Language, then English.
 */
export const locales = ["en", "pt", "nl", "es", "fr", "de", "af"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "locale";
export const LOCALE_STORAGE_KEY = "palsya.locale";

/** Native names, shown in the switcher regardless of the current UI language. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  nl: "Nederlands",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  af: "Afrikaans",
};

/** BCP 47 tags used for Intl formatting and Open Graph `og:locale`. */
export const localeRegions: Record<Locale, string> = {
  en: "en-GB",
  pt: "pt-PT",
  nl: "nl-NL",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  af: "af-ZA",
};

/** Message namespaces, one JSON file each under locales/<locale>/. */
export const namespaces = [
  "common",
  "landing",
  "howItWorks",
  "guides",
  "stories",
  "pricing",
  "about",
  "auth",
  "onboarding",
  "assessment",
  "dashboard",
  "programme",
  "library",
  "admin",
  "clinician",
  "errors",
  "emails",
  "passwordReset",
  "invite",
  "appProgramme",
  "appScan",
  "appProgress",
  "appSupport",
  "backoffice",
] as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header value. */
export function matchAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
