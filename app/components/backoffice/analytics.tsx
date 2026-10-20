import type { ReactNode } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { summarise, type BoPatient } from "../../../src/lib/backoffice";
import { Icon } from "../Icon";
import { Bars, CardTitle, Kpi, STAGE_COLOURS, StageBadge } from "./ui";

// Legacy prototype figures (views-admin.js analytics()) — no scan results are stored yet.
const DEMO_MEDIAN_CHANGE = [8.1, 16.4, 13.2, 7.6, 2.1];

/**
 * Engagement analytics for a set of patients: the whole platform for the
 * back office, one caseload for the clinician portal. `area` picks the KPI
 * labels; `extra` is rendered after the shared cards (admin-only demo cards).
 */
export async function AnalyticsView({ patients, area, extra }: { patients: BoPatient[]; area: "admin" | "clinician"; extra?: ReactNode }) {
  const t = await getTranslations("backoffice");
  const tp = await getTranslations("programme");
  const format = await getFormatter();
  const s = summarise(patients);
  const pct = (n: number | null) => (n === null ? t("common.dash") : t("common.percent", { n }));

  return (
    <>
      <div className="note note-clinical">
        <Icon name="info" size={19} className="note-icon" />
        <div>
          {t.rich("common.observationalNote", { b: (c) => <b>{c}</b> })}
          {area === "clinician" && ` ${t("clinician.analytics.caseloadNote")}`}
        </div>
      </div>

      <div className="bo-kpis" style={{ marginTop: "var(--s-5)" }}>
        <Kpi n={format.number(s.total)} label={t(`${area}.analytics.kpi.patients`)} />
        <Kpi n={pct(s.meanAdherence)} label={t(`${area}.analytics.kpi.adherence`)} />
        <Kpi n={s.medianDaysInStage === null ? t("common.dash") : format.number(s.medianDaysInStage)} label={t(`${area}.analytics.kpi.medianDays`)} />
        <Kpi n={format.number(s.active7d)} label={t(`${area}.analytics.kpi.activeWeek`)} />
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("common.analytics.sessionsByStageChart")}</h3>
          <div style={{ marginTop: 16 }}>
            <Bars
              max={100}
              data={s.stageEngagement.map((r) => ({ l: t("common.stageAbbrev", { n: r.stage }), v: r.adherence ?? 0, colour: STAGE_COLOURS[r.stage - 1] }))}
            />
          </div>
          <p className="small faint" style={{ marginTop: 12 }}>
            {t("common.analytics.sessionsByStageNote")}
          </p>
        </div>

        <div className="card card-pad-lg">
          <CardTitle demo={t("common.demo")}>{t("common.analytics.medianChange")}</CardTitle>
          <div style={{ marginTop: 16 }}>
            <Bars max={20} data={DEMO_MEDIAN_CHANGE.map((v, i) => ({ l: t("common.stageAbbrev", { n: i + 1 }), v, colour: STAGE_COLOURS[i] }))} />
          </div>
          <p className="small faint" style={{ marginTop: 12 }}>
            {t("common.analytics.medianChangeNote")} {t("common.analytics.scanNote")}
          </p>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <h3 className="h-card">{t("common.analytics.sessionsByStage")}</h3>
        <div className="tbl-wrap" style={{ marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("common.col.stage")}</th>
                <th className="num">{t("common.col.mean28d")}</th>
                <th className="num">{t("common.col.medianDays")}</th>
                <th className="num">{t("common.col.patients")}</th>
              </tr>
            </thead>
            <tbody>
              {s.stageEngagement.map((r) => (
                <tr key={r.stage}>
                  <td>
                    <StageBadge stage={r.stage} name={tp(`stages.${r.stage}.name`)} />
                  </td>
                  <td className="num">{pct(r.adherence)}</td>
                  <td className="num">{r.medianDays === null ? t("common.dash") : r.medianDays}</td>
                  <td className="num">{format.number(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small faint" style={{ marginTop: 12 }}>
          {t("common.analytics.stage3Note")}
        </p>
      </div>

      {extra}
    </>
  );
}
