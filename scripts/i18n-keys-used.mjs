// Checks that every literal message key used in code exists in English.
// Resolves `const t = useTranslations("ns")` / `await getTranslations("ns")`
// bindings per file and checks t("key"), t.rich("key"), t.has("key"),
// t.raw("key") and pageMetadata("path"). Template-literal keys are reported
// as dynamic (their prefix is checked instead).
//   node scripts/i18n-keys-used.mjs
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const en = {};
for (const f of fs.readdirSync("locales/en")) en[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(`locales/en/${f}`, "utf8"));
const has = (key) => key.split(".").reduce((o, k) => (o && typeof o === "object" && k in o ? o[k] : undefined), en) !== undefined;

const missing = [];
let checked = 0, dynamic = 0;

function scan(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!/Translations|pageMetadata|createTranslator/.test(src)) return;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nsOf = (call) => {
    const arg = call.arguments[0];
    if (!arg) return "";
    if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
    if (ts.isObjectLiteralExpression(arg)) {
      const p = arg.properties.find((x) => x.name?.getText(sf) === "namespace");
      if (p && ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) return p.initializer.text;
      return "";
    }
    return null; // dynamic namespace — can't check statically
  };
  // Namespace bound to `name` in the nearest enclosing scope, or undefined.
  const resolve = (node, name) => {
    for (let scope = node.parent; scope; scope = scope.parent) {
      if (!(ts.isBlock(scope) || ts.isSourceFile(scope))) continue;
      for (const st of scope.statements) {
        if (!ts.isVariableStatement(st)) continue;
        for (const d of st.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || d.name.text !== name || !d.initializer) continue;
          let init = d.initializer;
          if (ts.isAwaitExpression(init)) init = init.expression;
          if (ts.isCallExpression(init) && /^(useTranslations|getTranslations)$/.test(init.expression.getText(sf))) return nsOf(init);
          return undefined;
        }
      }
    }
    return undefined;
  };

  const report = (node, key) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    missing.push(`${file.replace(/\\/g, "/")}:${line + 1}  ${key}`);
  };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      const [base, method] = callee.split(".");
      const arg = node.arguments[0];
      let prefix = null;
      if (!method || /^(rich|markup|raw|has)$/.test(method)) {
        const ns = resolve(node, base);
        if (typeof ns === "string") prefix = ns;
      }
      if (callee === "pageMetadata") prefix = "";
      if (prefix !== null && arg) {
        const join = (k) => (prefix ? `${prefix}.${k}` : k);
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          checked++;
          const key = callee === "pageMetadata" ? `${arg.text}.title` : join(arg.text);
          if (!has(key)) report(node, key);
          if (callee === "pageMetadata" && !has(`${arg.text}.description`)) report(node, `${arg.text}.description`);
        } else if (ts.isTemplateExpression(arg)) {
          dynamic++;
          const head = arg.head.text.replace(/\.$/, "");
          if (head && !has(join(head))) report(node, `${join(head)}.* (dynamic)`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".next"].includes(e.name)) walk(p); }
    else if (/\.(tsx?|mjs)$/.test(e.name)) scan(p);
  }
}
for (const d of ["app", "src", "lib", "components", "i18n"]) if (fs.existsSync(d)) walk(d);

for (const m of missing) console.log(`missing: ${m}`);
console.log(`\n${checked} literal keys checked, ${dynamic} dynamic key prefixes checked, ${missing.length} missing.`);
process.exit(missing.length ? 1 : 0);
