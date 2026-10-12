import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { getDashboardData, getSessionHistory, getPhaseHistory } from "../data";
import { Icon } from "../../components/Icon";

export function generateMetadata() {
  return pageMetadata("dashboard.progress.meta");
}

function completionState(row: { tapingDone: boolean; exercisesDone: boolean; routineDone: boolean }): {
  state: "full" | "part" | "none";
  cls: string;
} {
  if (row.tapingDone && row.exercisesDone && row.routineDone) return { state: "full", cls: "badge-ok" };
  if (row.tapingDone || row.exercisesDone || row.routineDone) return { state: "part", cls: "badge-warn" };
  return { state: "none", cls: "badge-outline" };
}

export default async function ProgressPage() {
  const t = await getTranslations("dashboard");
  const tAll = await getTranslations();
  const tReasons = await getTranslations("assessment.reasons");
  const format = await getFormatter();
  const user = await currentUser();
  const data = user ? await getDashboardData(user.id) : null;

  const [sessions, phaseHistory] = data?.patientProfileId
    ? await Promise.all([getSessionHistory(data.patientProfileId), getPhaseHistory(data.patientProfileId)])
    : [[], []];

  /**
   * phase_assignments.reasons holds whatever the stage assignment stored:
   * a message key under assessment.reasons (optionally as { key, values, text },
   * where text is the English audit copy),
   * or — for rows written before localisation — an English sentence.
   */
  const reasonText = (reason: unknown): string | null => {
    if (typeof reason === "string") {
      return tReasons.has(reason) ? tReasons(reason) : reason;
    }
    if (reason && typeof reason === "object" && "key" in reason && typeof reason.key === "string") {
      const values = "values" in reason ? (reason.values as Record<string, string | number>) : undefined;
      if (tReasons.has(reason.key)) return tReasons(reason.key, values);
      return "text" in reason && typeof reason.text === "string" ? reason.text : null;
    }
    return null;
  };

  return (
    <div className="page">
      <Link className="link-arrow small" href="/dashboard">
        <Icon name="arrow-left" size={14} />
        {t("backToDashboard")}
      </Link>
      <h2 style={{ marginTop: 10 }}>{t("progress.title")}</h2>
      <p className="muted" style={{ marginTop: 4 }}>
        {t("progress.intro")}
      </p>

      <div className="grid g2" style={{ marginTop: "var(--s-7)", alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("progress.stageHistory")}</h3>
          {phaseHistory.length === 0 ? (
            <p className="small muted mt-4">{t("progress.noPhase")}</p>
          ) : (
            <div className="col" style={{ gap: 12, marginTop: 12 }}>
              {phaseHistory.map((p, i) => {
                const stageN = Math.min(5, Math.max(1, p.stage));
                const reason = p.reasons[0] != null ? reasonText(p.reasons[0]) : null;
                return (
                  <div key={i} className="row-between" style={{ alignItems: "flex-start" }}>
                    <div>
                      <span className={`badge badge-p${p.stage}`}>
                        {t("progress.stageBadge", { stage: p.stage, name: tAll(`programme.stages.${stageN}.name`) })}
                      </span>
                      {reason && (
                        <p className="small muted" style={{ marginTop: 6, maxWidth: "40ch" }}>
                          {reason}
                        </p>
                      )}
                    </div>
                    <span className="small faint tr" style={{ whiteSpace: "nowrap" }}>
                      {format.dateTime(new Date(p.assignedAt), { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("progress.sessionLog")}</h3>
          {sessions.length === 0 ? (
            <p className="small muted mt-4">{t("progress.noSessions")}</p>
          ) : (
            <div className="tbl-wrap" style={{ marginTop: 12 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("progress.columns.date")}</th>
                    <th>{t("progress.columns.status")}</th>
                    <th>{t("progress.columns.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const c = completionState(s);
                    return (
                      <tr key={s.date}>
                        <td>
                          {format.dateTime(new Date(`${s.date}T00:00:00Z`), {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            timeZone: "UTC",
                          })}
                        </td>
                        <td>
                          <span className={`badge ${c.cls}`}>{t(`progress.status.${c.state}`)}</span>
                        </td>
                        <td className="small muted">{s.observationNote || t("progress.noNote")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
