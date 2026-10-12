// Renders pages in every locale and reports text that is identical to the
// English render (i.e. probably untranslated). Needs a running server.
//   node scripts/i18n-render-check.mjs [baseUrl] [--cookie "__session=..."] [--paths /a,/b]
// Compares visible text nodes plus alt/title/aria-label/placeholder and
// <title>/meta description/og tags.
const args = process.argv.slice(2);
const base = args.find((a) => /^https?:/.test(a)) ?? "http://localhost:3000";
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const extraCookie = flag("--cookie");
const paths = (flag("--paths") ?? "/,/how-it-works,/guides,/stories,/pricing,/about,/login,/sign-in,/sign-up,/this-page-does-not-exist").split(",");
const locales = ["pt", "nl", "es", "fr", "de", "af"];

// Same in every language: names, brands, numbers, codes.
const ALLOW = [
  /^Palsya$/, /^Stripe$/, /^Google$/, /^Apple$/, /^GDPR$/, /^404$/, /^PT$/,
  /^(EN|PT|NL|ES|FR|DE|AF)$/, /^(English|Português|Nederlands|Español|Français|Deutsch|Afrikaans)$/,
  /^Dr\.? [A-Z]/, /^Prof\. /, /^[A-Z][a-zà-ÿ]+ [A-Z]\.$/, /, PT$/,
  /^(Marta|Tomás|Sanne|Marek T\.|Aisling M\.|Dieter H\.|Rosa C\.|Youssef B\.|Lena S\.)$/,
  /^(Health Tech Europe|Journal of Digital Rehabilitation|Der Standard|Bell's Palsy Association UK)$/,
  /^Wenn das Gesicht stillsteht/, /^Palsya Health, Lda/,
];

// Words that are spelled the same as English in a given language.
const ALLOW_BY_LOCALE = {
  pt: [/^Menu$/, /^Cookies$/, /^Normal$/],
  nl: [/^Menu$/, /^Cookies$/, /^Product$/, /^Interview$/, /^Week \d+$/, /^Status$/, /^Privacy$/, /^Massage$/],
  es: [/^Cookies$/, /^Normal$/],
  fr: [/^Menu$/, /^Cookies$/, /^Guides( — Palsya)?$/, /^\+\d+ consultations?$/, /^Patient$/, /^Note$/, /^Date$/, /^Taping$/, /^Massage$/, /^Tension$/, /^Coordination$/],
  de: [/^Cookies$/, /^Interview$/, /^Status$/, /^Taping$/, /^Massage$/, /^Normal$/, /^Optional$/],
  af: [/^Week \d+$/],
};
// "<publication> · <Month> <year>" where the month name is shared (September, November in nl/de/af).
const PRESS_LINE = /^[^·]+ · (September|November) \d{4}$/;
// "<first name>, <city>" story bylines — names and unchanged city names.
const NAME_CITY = /^(Marta|Tomás|Sanne|Marek T\.), (Porto|Utrecht|Kraków|Warsaw)$/;

const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, "—")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

function texts(html) {
  const out = new Set();
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ");
  for (const m of body.matchAll(/>([^<>]+)</g)) {
    const t = decode(m[1]).replace(/\s+/g, " ").trim();
    if (t) out.add(t);
  }
  for (const m of body.matchAll(/\s(?:alt|title|aria-label|placeholder|aria-valuetext)="([^"]*)"/g)) {
    const t = decode(m[1]).trim();
    if (t) out.add(`@${t}`);
  }
  for (const m of body.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"[^>]+content="([^"]*)"/g)) {
    out.add(`meta:${decode(m[1]).trim()}`);
  }
  return out;
}

const suspicious = (t, locale) => {
  const s = t.replace(/^(@|meta:)/, "");
  if (!/[A-Za-z]{3,}/.test(s)) return false;
  if (NAME_CITY.test(s) || (PRESS_LINE.test(s) && ["nl", "de", "af"].includes(locale))) return false;
  return ![...ALLOW, ...(ALLOW_BY_LOCALE[locale] ?? [])].some((re) => re.test(s));
};

async function get(path, locale) {
  const res = await fetch(base + path, {
    headers: { cookie: [`locale=${locale}`, extraCookie].filter(Boolean).join("; ") },
    redirect: "follow",
  });
  const html = await res.text();
  const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  return { status: res.status, html, lang, url: res.url };
}

const table = {};
let problems = 0;
for (const path of paths) {
  const en = await get(path, "en");
  const enTexts = texts(en.html);
  table[path] = { en: `${en.status}` };
  for (const locale of locales) {
    const page = await get(path, locale);
    const same = [...texts(page.html)].filter((t) => enTexts.has(t) && suspicious(t, locale));
    const langOk = page.lang === locale;
    table[path][locale] = same.length === 0 && langOk ? "✓" : `✗ ${same.length}${langOk ? "" : " lang"}`;
    if (same.length || !langOk) {
      problems++;
      console.log(`\n${path} [${locale}] html lang=${page.lang}${page.url !== base + path ? ` (→ ${page.url})` : ""}`);
      for (const t of same.slice(0, 40)) console.log(`   ${t.slice(0, 110)}`);
    }
  }
}
console.log();
console.table(table);
process.exit(problems ? 1 : 0);
