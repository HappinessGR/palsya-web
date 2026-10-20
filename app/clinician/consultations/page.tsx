import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { localeNames } from "../../../i18n/config";
import { requirePagePermission } from "../../../src/lib/authz";
import { Icon } from "../../components/Icon";
import { CardTitle, Kpi, StageBadge } from "../../components/backoffice/ui";
import { fromToday } from "../../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.clinician.meta");
}

// Demonstration rows: consultation booking has no table in the database yet,
// so nothing here is a real patient. Initials only, like the prototype.
const DEMO_UPCOMING = [
  { day: 0, time: "10:30", who: "M. Nowak", stage: 2, type: "followUp", lang: "en" },
  { day: 0, time: "14:00", who: "S. de Vries", stage: 3, type: "review", lang: "nl" },
  { day: 1, time: "09:15", who: "T. Ferreira", stage: 1, type: "first", lang: "pt" },
  { day: 2, time: "11:45", who: "K. Müller", stage: 4, type: "followUp", lang: "de" },
  { day: 3, time: "16:30", who: "E. García", stage: 3, type: "review", lang: "es" },
] as const;

/** Clinician portal — Consultations (demonstration data until booking is connected). */
export default async function ClinicianConsultationsPage() {
  await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("backoffice");
  const tp = await getTranslations("programme");
  const format = await getFormatter();
  const demo = t("common.demo");
  const when = (day: number, time: string) =>
    `${format.dateTime(fromToday(day), { weekday: "short", day: "numeric", month: "short" })} · ${time}`;

  return (
    <>
      <div className="note note-warn">
        <Icon name="info" size={19} className="note-icon" />
        <div>{t.rich("clinician.consultations.notConnected", { b: (c) => <b>{c}</b> })}</div>
      </div>

      <div className="bo-kpis" style={{ marginTop: "var(--s-5)" }}>
        <Kpi n={String(DEMO_UPCOMING.length)} label={t("clinician.consultations.kpi.upcoming")} />
        <Kpi n="31" label={t("clinician.consultations.kpi.callsMonth")} />
        <Kpi n="78%" label={t("clinician.consultations.kpi.utilisation")} delta={t("clinician.consultations.kpi.utilisationSub")} />
        <Kpi n="4.7" label={t("clinician.consultations.kpi.rating")} />
      </div>

      <div className="card card-pad-lg bo-section">
        <CardTitle demo={demo}>{t("clinician.consultations.upcoming")}</CardTitle>
        <div className="tbl-wrap" style={{ marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("clinician.consultations.col.when")}</th>
                <th>{t("clinician.consultations.col.patient")}</th>
                <th>{t("clinician.consultations.col.stage")}</th>
                <th>{t("clinician.consultations.col.type")}</th>
                <th>{t("clinician.consultations.col.language")}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_UPCOMING.map((c) => (
                <tr key={`${c.day}-${c.time}`}>
                  <td className="small strong">{when(c.day, c.time)}</td>
                  <td className="small">{c.who}</td>
                  <td>
                    <StageBadge stage={c.stage} name={tp(`stages.${c.stage}.name`)} />
                  </td>
                  <td className="small">{t(`clinician.consultations.type.${c.type}`)}</td>
                  <td className="small muted">{localeNames[c.lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <CardTitle demo={demo}>{t("clinician.consultations.quality")}</CardTitle>
        <p className="small muted mt-4">{t("clinician.consultations.qualityNote")}</p>
        <div className="grid g3" style={{ marginTop: 20 }}>
          <div className="stat">
            <div className="stat-n">92%</div>
            <div className="stat-l">{t("clinician.consultations.stat.specificPlan")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">88%</div>
            <div className="stat-l">{t("clinician.consultations.stat.understoodSituation")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">2.1%</div>
            <div className="stat-l">{t("clinician.consultations.stat.escalated")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
