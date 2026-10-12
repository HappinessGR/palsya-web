// Brings every locale's files into line with English:
//   - same files, same key order as locales/en
//   - keys that no longer exist in English are dropped
//   - optional: merge translations from a flat { "ns.path.key": "text" } JSON file per locale
//   node scripts/i18n-sync.mjs                       → reorder + drop obsolete keys only
//   node scripts/i18n-sync.mjs --merge <dir>         → also merge <dir>/<locale>.json
// Keys missing from a locale stay missing (English fallback + dev warning) — run i18n-check after.
import fs from "node:fs";
import path from "node:path";

const locales = ["pt", "nl", "es", "fr", "de", "af"];
const mergeIdx = process.argv.indexOf("--merge");
const mergeDir = mergeIdx > 0 ? process.argv[mergeIdx + 1] : null;
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {});
const get = (o, keys) => keys.reduce((x, k) => (x && typeof x === "object" ? x[k] : undefined), o);

for (const locale of locales) {
  const merged = mergeDir ? read(path.join(mergeDir, `${locale}.json`)) : {};
  let added = 0;
  let dropped = 0;
  for (const file of fs.readdirSync("locales/en").filter((f) => f.endsWith(".json"))) {
    const ns = file.replace(/\.json$/, "");
    const en = read(`locales/en/${file}`);
    const cur = read(`locales/${locale}/${file}`);
    const build = (enNode, trail) => {
      if (enNode && typeof enNode === "object") {
        const out = {};
        for (const [k, v] of Object.entries(enNode)) {
          const value = build(v, [...trail, k]);
          if (value !== undefined) out[k] = value;
        }
        return Object.keys(out).length ? out : undefined;
      }
      const flatKey = [ns, ...trail].join(".");
      if (typeof merged[flatKey] === "string") {
        added++;
        return merged[flatKey];
      }
      return get(cur, trail);
    };
    const count = (o) => (o && typeof o === "object" ? Object.values(o).reduce((n, v) => n + count(v), 0) : 1);
    const next = build(en, []) ?? {};
    dropped += Math.max(0, count(cur) - count(next) + 0);
    fs.mkdirSync(`locales/${locale}`, { recursive: true });
    fs.writeFileSync(`locales/${locale}/${file}`, JSON.stringify(next, null, 2) + "\n");
  }
  console.log(`${locale}: merged ${added}, dropped ${dropped} obsolete`);
}
