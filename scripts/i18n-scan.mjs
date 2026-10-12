// Finds user-facing text that is hard-coded instead of coming from locales/.
//   node scripts/i18n-scan.mjs [dir ...]   (default: app components src/lib lib)
// Reports JSX text, user-facing attributes (alt, aria-*, title, placeholder,
// label) and prose-looking string literals. Add `// i18n-ignore` on (or the
// line above) a line to silence a deliberate exception.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["app", "components", "src/lib", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", "api", "db"]);
const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "label", "aria-label", "aria-description", "aria-valuetext", "aria-roledescription"]);
const NON_TEXT_ATTRS = new Set(["className", "href", "src", "id", "key", "type", "name", "value", "role", "htmlFor", "rel", "target", "method", "action", "autoComplete", "inputMode", "lang", "fill", "stroke", "d", "viewBox", "style", "as", "variant", "size", "icon", "strategy", "path", "fallbackRedirectUrl", "redirectUrl", "forceRedirectUrl"]);
const CALL_SKIP = /^(t|tt|t\.rich|t\.markup|t\.raw|t\.has|useTranslations|getTranslations|pageMetadata|console\.\w+|require|import|redirect|router\.push|router\.replace|fetch|searchParams\.get|cookies|headers|new Error|Error|z\.\w+|clsx|cn|cva|setItem|getItem|addEventListener|removeEventListener|querySelector|matchMedia|Intl\.\w+|toLocaleDateString|toLocaleString|includes|startsWith|endsWith|split|replace|join|encodeURIComponent|URLSearchParams|revalidatePath|eq|sql)$/;

const findings = [];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  if (fs.statSync(dir).isFile()) return scanFile(dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkDir(p);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      scanFile(p);
    }
  }
}

// Capitalised words or punctuated phrases; skips identifiers, paths, URLs,
// CSS classes and SCREAMING_CASE constants.
const looksLikeProse = (s) => {
  const t = s.trim();
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(t)) return false;
  if (/^[\w.\-/:#@?=&%[\]()*+,]+$/.test(t) && !/^[A-ZÀ-Ý][a-zà-ÿ]{2,}$/.test(t)) return false;
  if (/^[A-Z0-9_]+$/.test(t) || /^(https?:|\/|\.\/|--)/.test(t)) return false;
  return /^[¿¡"“(]?[A-ZÀ-Ý]/.test(t) || (/\s/.test(t) && /[.!?…:]$/.test(t));
};

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return `${calleeName(expr.expression)}.${expr.name.text}`;
  return "";
}

function scanFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ignored = (pos) => {
    const line = sf.getLineAndCharacterOfPosition(pos).line;
    return /i18n-ignore/.test(lines[line] ?? "") || /i18n-ignore/.test(lines[line - 1] ?? "");
  };
  const report = (node, kind, text) => {
    if (ignored(node.getStart(sf))) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file: file.replace(/\\/g, "/"), line: line + 1, kind, text: text.replace(/\s+/g, " ").trim().slice(0, 90) });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    // sql`...` (Drizzle) and other tagged SQL templates are queries, not UI text.
    if (ts.isTaggedTemplateExpression(node) && /^(sql|sql\.raw)$/.test(node.tag.getText(sf))) return;
    if (ts.isJsxText(node)) {
      const text = node.getText(sf);
      if (/[A-Za-zÀ-ÿ]{2,}/.test(text.replace(/&#?\w+;/g, ""))) report(node, "jsx-text", text);
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      const init = node.initializer;
      const lit = init && (ts.isStringLiteral(init) ? init : ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression) ? init.expression : null);
      if (lit && TEXT_ATTRS.has(name) && /[A-Za-z]{2,}/.test(lit.text)) report(node, `attr:${name}`, lit.text);
      if (NON_TEXT_ATTRS.has(name) || TEXT_ATTRS.has(name)) return;
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const name = (ts.isNewExpression(node) ? "new " : "") + calleeName(node.expression);
      if (CALL_SKIP.test(name) || CALL_SKIP.test(calleeName(node.expression))) return;
    } else if (ts.isPropertyAssignment(node)) {
      const key = node.name.getText(sf).replace(/["']/g, "");
      if (NON_TEXT_ATTRS.has(key) || /^(slug|id|href|colour|color|icon|stripePriceId|v|value|type|kind|variant|strategy|path|route|section|author|reviewer|who|pub)$/.test(key)) return;
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && looksLikeProse(node.text)) {
      const parent = node.parent;
      if (ts.isExpressionStatement(parent)) return; // "use client"
      if (ts.isLiteralTypeNode(parent) || ts.isCaseClause(parent)) return;
      if (ts.isBinaryExpression(parent) && /[=!]==?/.test(parent.operatorToken.getText(sf))) return;
      report(node, "string", node.text);
    } else if (ts.isTemplateExpression(node)) {
      const text = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" … ");
      if (looksLikeProse(text)) report(node, "template", text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

for (const d of dirs) walkDir(d);

const byFile = new Map();
for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
for (const [file, items] of byFile) {
  console.log(`\n${file} (${items.length})`);
  for (const f of items) console.log(`  ${f.line}  [${f.kind}]  ${f.text}`);
}
console.log(`\n${findings.length} possible hard-coded string(s) in ${byFile.size} file(s).`);
process.exit(findings.length ? 1 : 0);
