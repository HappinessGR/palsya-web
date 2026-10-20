import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { localeNames, locales } from "../../../i18n/config";
import { requirePagePermission } from "../../../src/lib/authz";
import { programmeItemTotal } from "../../../src/lib/backoffice";
import { articles } from "../../lib/content";
import { hasArticleBody } from "../../lib/articles";
import { Icon } from "../../components/Icon";
import { Kpi } from "../../components/backoffice/ui";
import { GuidesTable, ProgrammeByStage, isReviewDue } from "../../components/backoffice/content";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

/** Back office — Content (legacy views-admin.js content()). */
export default async function AdminContentPage() {
  await requirePagePermission("users:read");
  const t = await getTranslations("backoffice");
  const items = await programmeItemTotal();

  // Per language: guides whose body exists in that language (the FAQ is in every locale file).
  const translation = locales.map((l) => ({
    locale: l,
    done: articles.filter((a) => a.faq || hasArticleBody(a.slug, l)).length,
  }));

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={String(articles.length)} label={t("admin.content.kpi.publishedGuides")} />
        <Kpi n={String(locales.length)} label={t("admin.content.kpi.languages")} />
        <Kpi n={String(items)} label={t("admin.content.kpi.programmeItems")} />
        <Kpi n={String(articles.filter((a) => isReviewDue(a)).length)} label={t("admin.content.kpi.reviewDue")} />
      </div>

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("admin.content.knowledgeBase")}</h3>
        </div>
        <GuidesTable />
        <div className="note note-clinical" style={{ marginTop: 18 }}>
          <Icon name="stethoscope" size={18} className="note-icon" />
          <div>{t.rich("common.content.twoPersonRule", { b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("common.programmeByStage")}</h3>
          <ProgrammeByStage />
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.content.translationStatus")}</h3>
          <div className="stack-sm" style={{ marginTop: 14 }}>
            {translation.map((r) => {
              const colour = r.done === articles.length ? "var(--ok)" : r.done > 1 ? "var(--warn)" : "var(--ink-4)";
              return (
                <div className="row-between" key={r.locale}>
                  <span className="small row" style={{ gap: 8 }}>
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: colour }} />
                    {localeNames[r.locale]}
                  </span>
                  <span className="small strong num">{t("admin.content.translationRow", { done: r.done, total: articles.length })}</span>
                </div>
              );
            })}
          </div>
          <p className="small faint" style={{ marginTop: 16 }}>
            {t("admin.content.machineNote")}
          </p>
        </div>
      </div>
    </>
  );
}
