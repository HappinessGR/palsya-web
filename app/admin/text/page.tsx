import Link from "next/link";
import type { AbstractIntlMessages } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { defaultLocale, isLocale, localeNames, locales, namespaces, type Locale } from "../../../i18n/config";
import { flattenMessages, loadMessages, messageAt } from "../../../i18n/messages";
import { requirePagePermission } from "../../../src/lib/authz";
import { listOverrides, type OverrideRow } from "../../../src/lib/site-text";
import { Icon } from "../../components/Icon";
import { param } from "../shared";
import { previewAction, publishPageAction, textAction } from "./actions";
import { PUBLIC_NAMESPACES } from "./shared";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.text.meta");
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RESULTS = ["saved", "published", "discarded", "reverted", "publishedAll"] as const;
const ERRORS = ["forbidden", "invalid_input", "unknown_key", "too_long", "empty", "bad_syntax", "placeholders_changed", "tags_changed"] as const;

/** Rows for a textarea: roughly one per 70 characters or line, within reason. */
const rowsFor = (text: string) => Math.min(12, Math.max(1, text.split("\n").length, Math.ceil(text.length / 70)));

/**
 * Back office — Website text. Every UI message comes from locales/<locale>/*.json;
 * this page edits database overrides of them (src/lib/site-text.ts): save a
 * draft, preview it on the real page, then publish it to everyone.
 */
export default async function AdminTextPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePagePermission("content:write");
  const sp = await searchParams;
  const nsParam = param(sp, "ns");
  const ns = nsParam && (namespaces as readonly string[]).includes(nsParam) ? nsParam : "landing";
  const localeParam = param(sp, "locale");
  const locale: Locale = isLocale(localeParam) ? localeParam : defaultLocale;
  const q = (param(sp, "q") ?? "").trim();
  const changedOnly = param(sp, "changed") === "1";
  const result = RESULTS.find((r) => r === param(sp, "result"));
  const error = ERRORS.find((e) => e === param(sp, "error"));
  const detail = param(sp, "detail");

  const t = await getTranslations("backoffice.admin.text");
  const format = await getFormatter();

  const english = await loadMessages(defaultLocale);
  const own = locale === defaultLocale ? english : await loadMessages(locale);
  const rows = await listOverrides(locale === defaultLocale ? [locale] : [locale, defaultLocale]);
  const byKey = (l: Locale) => new Map(rows.filter((r) => r.locale === l).map((r) => [r.key, r]));
  const mine = byKey(locale);
  const englishEdits = byKey(defaultLocale);

  const draftsIn = (name: string) => rows.filter((r) => r.locale === locale && r.draftValue !== null && r.key.startsWith(`${name}.`)).length;
  const orderedNs = [...PUBLIC_NAMESPACES, ...namespaces.filter((n) => !(PUBLIC_NAMESPACES as readonly string[]).includes(n))];

  // English edited after this language's text was last set → the translation may be stale.
  const outdated = (key: string, row: OverrideRow | undefined) => {
    if (locale === defaultLocale) return false;
    const en = englishEdits.get(key)?.publishedAt;
    return Boolean(en && (!row?.publishedAt || en > row.publishedAt));
  };

  const needle = q.toLowerCase();
  const entries = flattenMessages(english[ns] as AbstractIntlMessages, ns)
    .map(([key, englishText]) => {
      const row = mine.get(key);
      const defaultValue = messageAt(own, key) ?? englishText;
      return { key, englishText, defaultValue, row, outdated: outdated(key, row) };
    })
    .filter((e) => !changedOnly || e.row || e.outdated)
    .filter(
      (e) =>
        !needle ||
        e.key.toLowerCase().includes(needle) ||
        [e.defaultValue, e.englishText, e.row?.publishedValue, e.row?.draftValue].some((v) => v?.toLowerCase().includes(needle)),
    );

  const pageDrafts = draftsIn(ns);
  const stamp = (d: Date | null) => (d ? format.dateTime(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  const hidden = (
    <>
      <input type="hidden" name="ns" value={ns} />
      <input type="hidden" name="locale" value={locale} />
      {q && <input type="hidden" name="q" value={q} />}
      {changedOnly && <input type="hidden" name="changed" value="1" />}
    </>
  );

  return (
    <>
      <div className="greet">
        <h2>{t("heading")}</h2>
        <p>{t("subtitle")}</p>
      </div>

      {error && (
        <div className="note note-safety" role="alert" style={{ marginBottom: "var(--s-5)" }}>
          <Icon name="alert" size={18} className="note-icon" />
          <div>
            {t(`error.${error}`)}
            {detail && <div className="small" style={{ marginTop: 4 }}>{t("errorDetail", { detail })}</div>}
          </div>
        </div>
      )}
      {result && (
        <div className="note note-ok" role="status" style={{ marginBottom: "var(--s-5)" }}>
          <Icon name="check-circle" size={18} className="note-icon" />
          <div>{t(`result.${result}`, { count: Number(param(sp, "count") ?? 0) })}</div>
        </div>
      )}

      <div className="card card-pad-lg">
        <form className="row-wrap" action="/admin/text" method="get" style={{ gap: 12, alignItems: "flex-end" }}>
          <label className="stack-sm small">
            <span className="strong">{t("filters.page")}</span>
            <select className="input" name="ns" defaultValue={ns}>
              {orderedNs.map((n) => {
                const drafts = draftsIn(n);
                return (
                  <option key={n} value={n}>
                    {t.has(`ns.${n}`) ? t(`ns.${n}`) : n}
                    {drafts ? ` — ${t("filters.drafts", { n: drafts })}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="stack-sm small">
            <span className="strong">{t("filters.language")}</span>
            <select className="input" name="locale" defaultValue={locale}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="stack-sm small" style={{ flex: "1 1 220px" }}>
            <span className="strong">{t("filters.search")}</span>
            <input className="input" type="search" name="q" defaultValue={q} placeholder={t("filters.searchPlaceholder")} />
          </label>
          <label className="row small" style={{ gap: 6, paddingBottom: 10 }}>
            <input type="checkbox" name="changed" value="1" defaultChecked={changedOnly} />
            {t("filters.changedOnly")}
          </label>
          <button className="btn btn-sm" type="submit">
            <Icon name="filter" size={15} />
            {t("filters.apply")}
          </button>
        </form>
      </div>

      <div className="row-between bo-section" style={{ flexWrap: "wrap", gap: 12 }}>
        <p className="small muted">{t("count", { n: entries.length, drafts: pageDrafts })}</p>
        <div className="row-wrap">
          <form action={previewAction}>
            {hidden}
            <button className="btn btn-sm btn-ghost" type="submit">
              <Icon name="eye" size={15} />
              {t("preview")}
            </button>
          </form>
          <form action={publishPageAction}>
            {hidden}
            <button className="btn btn-sm" type="submit" disabled={pageDrafts === 0}>
              <Icon name="check" size={15} />
              {t("publishAll", { n: pageDrafts })}
            </button>
          </form>
        </div>
      </div>

      <div className="note" style={{ marginTop: "var(--s-4)" }}>
        <Icon name="info" size={18} className="note-icon" />
        <div className="small">{t.rich("howTo", { b: (c) => <b>{c}</b>, code: (c) => <code>{c}</code> })}</div>
      </div>

      {entries.length === 0 ? (
        <p className="muted bo-section">{t("empty")}</p>
      ) : (
        <div className="stack-sm bo-section">
          {entries.map((e) => {
            const row = e.row;
            const live = row?.publishedValue ?? e.defaultValue;
            const value = row?.draftValue ?? live;
            const anchor = `k-${e.key.replace(/[^A-Za-z0-9_-]/g, "-")}`;
            return (
              <div className="card card-pad-sm" id={anchor} key={e.key} style={{ scrollMarginTop: 80 }}>
                <div className="row-between" style={{ gap: 8, flexWrap: "wrap" }}>
                  <code className="small muted">{e.key}</code>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    {row?.draftValue !== null && row?.draftValue !== undefined && (
                      <span className="badge badge-warn">{t("badge.draft", { when: stamp(row.draftUpdatedAt) })}</span>
                    )}
                    {row?.publishedValue !== null && row?.publishedValue !== undefined && (
                      <span className="badge badge-ok">{t("badge.published", { when: stamp(row.publishedAt) })}</span>
                    )}
                    {e.outdated && <span className="badge badge-brand">{t("badge.englishChanged")}</span>}
                  </div>
                </div>

                {locale !== defaultLocale && (
                  <p className="small muted" style={{ marginTop: 8 }}>
                    <span className="strong">{t("english")}</span> {englishEdits.get(e.key)?.publishedValue ?? e.englishText}
                  </p>
                )}
                {row?.publishedValue != null && (
                  <p className="small faint" style={{ marginTop: 4 }}>
                    <span className="strong">{t("original")}</span> {e.defaultValue}
                  </p>
                )}

                <form action={textAction} style={{ marginTop: 10 }}>
                  {hidden}
                  <input type="hidden" name="key" value={e.key} />
                  <textarea
                    className="input"
                    name="value"
                    defaultValue={value}
                    rows={rowsFor(value)}
                    aria-label={e.key}
                    style={{ width: "100%", fontFamily: "inherit", resize: "vertical" }}
                  />
                  <div className="row-wrap" style={{ marginTop: 8, gap: 8 }}>
                    <button className="btn btn-sm btn-ghost" type="submit" name="intent" value="save">
                      {t("actions.save")}
                    </button>
                    <button className="btn btn-sm" type="submit" name="intent" value="publish">
                      {t("actions.publish")}
                    </button>
                    {row?.draftValue != null && (
                      <button className="btn btn-sm btn-quiet" type="submit" name="intent" value="discard">
                        {t("actions.discard")}
                      </button>
                    )}
                    {row && (
                      <button className="btn btn-sm btn-quiet" type="submit" name="intent" value="revert">
                        {t("actions.revert")}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <p className="small faint bo-section">
        <Link href="/admin/audit">{t("auditLink")}</Link>
      </p>
    </>
  );
}
