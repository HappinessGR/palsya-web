/**
 * Long-form guide bodies, ported from the legacy prototype's article content
 * (assets/js/content.js + assets/js/i18n/content-<locale>.js). Kept out of
 * the next-intl message files because they are HTML and only needed on
 * /guides/[slug]. Titles and blurbs live in locales/<locale>/guides.json.
 *
 * A locale without its own translation (currently nl, af) falls back to English.
 */
import "server-only";
import type { Locale } from "../../i18n/config";
import en from "../../content/articles/en.json";
import de from "../../content/articles/de.json";
import es from "../../content/articles/es.json";
import fr from "../../content/articles/fr.json";
import pt from "../../content/articles/pt.json";

export type ArticleBody = {
  /** Section headings, in order; entry i links to #s-(i+1) in the body. */
  toc: string[];
  /** Trusted static HTML (p, h2, ul/ol, strong, em). */
  body: string;
};

const bodies: Partial<Record<Locale, Record<string, ArticleBody>>> = { en, de, es, fr, pt };

export function articleBody(slug: string, locale: Locale): ArticleBody | null {
  return bodies[locale]?.[slug] ?? bodies.en?.[slug] ?? null;
}
