import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localeRegions, locales, type Locale } from "./config";

/**
 * Localised <title>, meta description and Open Graph tags for a page.
 * `key` is the full message path of an object holding `title` and
 * `description`, e.g. "pricing.meta" or "dashboard.progress.meta".
 * Pass `values` for titles that interpolate data (e.g. a user's name).
 */
export async function pageMetadata(key: string, values?: Record<string, string | number>): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const title = t(`${key}.title`, values);
  const description = t(`${key}.description`, values);
  const siteName = t("common.meta.title");
  const og = (l: Locale) => localeRegions[l].replace("-", "_");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      locale: og(locale),
      alternateLocale: locales.filter((l) => l !== locale).map(og),
    },
    twitter: { card: "summary", title, description },
  };
}
