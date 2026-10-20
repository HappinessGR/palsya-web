import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { articles, type Article } from "../../lib/content";
import { Icon } from "../../components/Icon";
import { Kpi } from "../../components/backoffice/ui";
import { GuidesTable, ProgrammeByStage, isReviewDue } from "../../components/backoffice/content";

export async function generateMetadata() {
  return pageMetadata("backoffice.clinician.meta");
}

/**
 * Clinician portal — Content: the admin knowledge-base table, read-only, with
 * the guides this clinician wrote or reviews marked. Authors and reviewers
 * are names in app/lib/content.ts, so they are matched by full name.
 */
export default async function ClinicianContentPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("backoffice");

  const me = actor.fullName.trim().toLowerCase();
  const roleOf = (a: Article): "author" | "reviewer" | null =>
    a.author?.toLowerCase() === me ? "author" : a.reviewer.toLowerCase() === me ? "reviewer" : null;
  const written = articles.filter((a) => roleOf(a) === "author");
  const reviewing = articles.filter((a) => roleOf(a) === "reviewer");

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={String(written.length)} label={t("clinician.content.kpi.written")} />
        <Kpi n={String(reviewing.length)} label={t("clinician.content.kpi.reviewing")} />
        <Kpi n={String([...written, ...reviewing].filter((a) => isReviewDue(a)).length)} label={t("clinician.content.kpi.dueYours")} />
        <Kpi n={String(articles.length)} label={t("clinician.content.kpi.published")} />
      </div>

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("clinician.content.guides")}</h3>
        </div>
        <GuidesTable roleOf={roleOf} />
        <div className="note note-clinical" style={{ marginTop: 18 }}>
          <Icon name="stethoscope" size={18} className="note-icon" />
          <div>{t.rich("common.content.twoPersonRule", { b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <h3 className="h-card">{t("common.programmeByStage")}</h3>
        <ProgrammeByStage />
      </div>
    </>
  );
}
