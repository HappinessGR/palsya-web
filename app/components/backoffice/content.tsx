import { getFormatter, getTranslations } from "next-intl/server";
import { locales } from "../../../i18n/config";
import { articles, type Article } from "../../lib/content";
import { hasArticleBody } from "../../lib/articles";
import { ROUTINE_MINUTES, TAPING_MINUTES, stage as stageInfo } from "../../lib/programme";
import { programmeItemsByStage } from "../../../src/lib/backoffice";
import { StageBadge } from "./ui";

/** Guides older than this are flagged for clinical re-review (legacy: 180 days). */
const REVIEW_AFTER_DAYS = 180;

export function isReviewDue(a: Article, now = new Date()): boolean {
  return now.getTime() - new Date(`${a.updated}T00:00:00Z`).getTime() > REVIEW_AFTER_DAYS * 86_400_000;
}

/** Locales a guide is published in (the FAQ lives in the locale files, so it is in all of them). */
export function guideLanguages(a: Article): number {
  return a.faq ? locales.length : locales.filter((l) => hasArticleBody(a.slug, l)).length;
}

/**
 * The knowledge-base table (legacy views-admin.js content()). `roleOf` adds a
 * "Your role" column for the clinician portal.
 */
export async function GuidesTable({ roleOf }: { roleOf?: (a: Article) => "author" | "reviewer" | null }) {
  const t = await getTranslations("backoffice");
  const tg = await getTranslations("guides.articles");
  const format = await getFormatter();

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("common.content.col.title")}</th>
            {roleOf && <th>{t("clinician.content.col.yourRole")}</th>}
            <th>{t("common.content.col.author")}</th>
            <th>{t("common.content.col.reviewer")}</th>
            <th>{t("common.content.col.updated")}</th>
            <th className="num">{t("common.content.col.languages")}</th>
            <th>{t("common.content.col.status")}</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => {
            const due = isReviewDue(a);
            const role = roleOf?.(a) ?? null;
            return (
              <tr key={a.slug}>
                <td>
                  <div className="strong">{tg(`${a.slug}.title`)}</div>
                  <div className="small muted">{t("common.content.minRead", { n: a.read })}</div>
                </td>
                {roleOf && (
                  <td>{role ? <span className="badge badge-brand">{t(`clinician.content.role.${role}`)}</span> : <span className="muted">{t("clinician.content.role.none")}</span>}</td>
                )}
                <td className="small">{a.author ?? t("common.content.authorTeam")}</td>
                <td className="small">{a.reviewer}</td>
                <td className={due ? "small" : "small muted"}>
                  {format.dateTime(new Date(`${a.updated}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                </td>
                <td className="num">
                  {guideLanguages(a)}/{locales.length}
                </td>
                <td>
                  {due ? (
                    <span className="badge badge-warn">{t("common.content.reviewDue")}</span>
                  ) : (
                    <span className="badge badge-ok">{t("common.content.current")}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Active exercises / taping techniques / routine items per stage, from the content library tables. */
export async function ProgrammeByStage() {
  const t = await getTranslations("backoffice");
  const tp = await getTranslations("programme");
  const rows = await programmeItemsByStage();

  return (
    <div className="tbl-wrap" style={{ marginTop: 14 }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("common.col.stage")}</th>
            <th className="num">{t("common.col.exercises")}</th>
            <th className="num">{t("common.col.taping")}</th>
            <th className="num">{t("common.col.routine")}</th>
            <th className="num">{t("common.col.minutes")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stage}>
              <td>
                <StageBadge stage={r.stage} name={tp(`stages.${r.stage}.name`)} />
              </td>
              <td className="num">{r.exercises}</td>
              <td className="num">{r.taping}</td>
              <td className="num">{r.routine}</td>
              <td className="num">{stageInfo(r.stage).minutes + TAPING_MINUTES + ROUTINE_MINUTES}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
