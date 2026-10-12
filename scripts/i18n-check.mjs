// Compares every locale's message files against English.
//   node scripts/i18n-check.mjs            → report; exit 1 on missing/extra keys or placeholder mismatches
//   node scripts/i18n-check.mjs --same     → also list values identical to English (possible untranslated text)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "locales");
const locales = ["en", "pt", "nl", "es", "fr", "de", "af"];
const showSame = process.argv.includes("--same");

// Values that are legitimately the same in every language.
const SAME_OK = new Set(["Palsya", "404", "Stripe", "GDPR", "OK", "PT", "Dr.", "Email", "E-mail", "Online", "Premium"]);

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

// ICU structure: argument names, select/plural branch keys and rich-text
// tags — not the text inside branches. Parsed with the ICU parser that
// next-intl itself depends on (transitive dependency); a syntax error is
// reported as "INVALID".

function tokens(value) {
  if (typeof value !== "string") return "";
  let ast;
  try {
    ast = parse(value, { ignoreTag: false });
  } catch (e) {
    return `INVALID(${e.message})`;
  }
  const found = new Set();
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type === TYPE.argument || n.type === TYPE.number || n.type === TYPE.date || n.type === TYPE.time) found.add(`{${n.value}}`);
      if (n.type === TYPE.select || n.type === TYPE.plural) {
        found.add(`{${n.value}:${n.type === TYPE.select ? "select" : "plural"}}`);
        for (const [key, opt] of Object.entries(n.options)) {
          // Plural categories legitimately differ by language; select keys must match.
          if (n.type === TYPE.select || key.startsWith("=")) found.add(`${n.value}.${key}`);
          walk(opt.value);
        }
      }
      if (n.type === TYPE.tag) {
        found.add(`<${n.value}>`);
        walk(n.children);
      }
    }
  };
  walk(ast);
  return [...found].sort().join(",");
}

const load = (locale) => {
  const dir = path.join(root, locale);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  const all = {};
  for (const f of files) {
    const ns = f.replace(/\.json$/, "");
    Object.assign(all, flatten(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), ns));
  }
  return { files, all };
};

const en = load("en");
const enKeys = Object.keys(en.all);
if (!enKeys.length) {
  console.error(`No English messages found under ${root}/en`);
  process.exit(2);
}
let failed = false;
const summary = [];

for (const locale of locales.slice(1)) {
  const { files, all } = load(locale);
  const missingFiles = en.files.filter((f) => !files.includes(f));
  const missing = enKeys.filter((k) => !(k in all));
  const extra = Object.keys(all).filter((k) => !(k in en.all));
  const badTokens = enKeys.filter((k) => k in all && tokens(all[k]) !== tokens(en.all[k]));
  const same = enKeys.filter(
    (k) => typeof en.all[k] === "string" && all[k] === en.all[k] && /[a-z]{3,}/i.test(en.all[k]) && !SAME_OK.has(en.all[k]),
  );

  summary.push({ locale, keys: Object.keys(all).length, missing: missing.length, extra: extra.length, placeholders: badTokens.length, sameAsEnglish: same.length });
  if (missingFiles.length || missing.length || extra.length || badTokens.length) failed = true;

  const list = (label, items) => {
    if (!items.length) return;
    console.log(`\n[${locale}] ${label} (${items.length}):`);
    for (const k of items.slice(0, 200)) console.log(`  ${k}`);
  };
  list("missing files", missingFiles);
  list("missing keys", missing);
  list("extra keys", extra);
  list("placeholder/tag mismatch", badTokens.map((k) => `${k}  en=${tokens(en.all[k])}  ${locale}=${tokens(all[k])}`));
  if (showSame) list("identical to English", same.map((k) => `${k} = ${JSON.stringify(all[k]).slice(0, 80)}`));
}

console.log(`\nEnglish keys: ${enKeys.length}`);
console.table(summary);
process.exit(failed ? 1 : 0);
