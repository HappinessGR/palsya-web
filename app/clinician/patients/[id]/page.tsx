import Link from "next/link";
import { notFound } from "next/navigation";
import type { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { SiteHeader } from "../../../components/SiteHeader";
import { Icon } from "../../../components/Icon";
import { pageMetadata } from "../../../../i18n/metadata";
import { requirePagePermission } from "../../../../src/lib/authz";
import { getPatientForClinician, isUuid, listNotes, overrideReasonText } from "../../../../src/lib/clinician";
import { getPhaseHistory, getSessionHistory } from "../../../dashboard/data";
import { AddNoteForm, ChangeStageForm } from "./PatientForms";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata() {
  // Generic title: the patient's name never goes into <title> / Open Graph tags.
  return pageMetadata("clinician.patient.meta");
}

function completionState(row: { tapingDone: boolean; exercisesDone: boolean; routineDone: boolean }) {
  if (row.tapingDone && row.exercisesDone && row.routineDone) return { state: "full", cls: "badge-ok" } as const;
  if (row.tapingDone || row.exercisesDone || row.routineDone) return { state: "part", cls: "badge-warn" } as const;
  return { state: "none", cls: "badge-outline" } as const;
}

export default async function ClinicianPatientPage({ params }: Props) {
  const actor = await requirePagePermission("patients:assigned:read");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Unknown and not-assigned look the same: 404, so existence isn't revealed.
  const patient = await getPatientForClinician(actor, id);
  if (!patient) notFound();

  const [sessions, phaseHistory, notes] = await Promise.all([
    getSessionHistory(patient.patientProfileId),
    getPhaseHistory(patient.patientProfileId),
    listNotes(patient.patientProfileId),
  ]);

  const t = await getTranslations("clinician.patient");
  const tAll = await getTranslations();
  const format = await getFormatter();
  const stageName = (n: number) => tAll(`programme.stages.${Math.min(5, Math.max(1, n))}.name`);
  const utcDay = (iso: string, opts: DateTimeFormatOptions) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), { ...opts, timeZone: "UTC" });

  return (
    <>
      <SiteHeader />
      <div className="page">
        <Link className="link-arrow small" href="/clinician">
          <Icon name="arrow-left" size={14} />
          {t("back")}
        </Link>

        <div className="row-between" style={{ marginTop: 10, flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2>{patient.fullName}</h2>
            <p className="small muted" style={{ marginTop: 4 }}>
              {patient.email}
              {" · "}
              {patient.onsetDate
                ? t("onset", { date: utcDay(patient.onsetDate, { day: "numeric", month: "short", year: "numeric" }) })
                : t("noOnset")}
            </p>
          </div>
          {patient.stage ? (
            <span className={`badge badge-p${patient.stage}`}>
              {t("stageBadge", { stage: patient.stage, name: stageName(patient.stage) })}
            </span>
          ) : (
            <span className="badge badge-outline">{t("noStage")}</span>
          )}
        </div>

        <div className="grid g2" style={{ marginTop: "var(--s-7)", alignItems: "start" }}>
          <div className="card card-pad-lg">
            <h3 className="h-card">{t("stageHistory.title")}</h3>
            {phaseHistory.length === 0 ? (
              <p className="small muted mt-4">{t("stageHistory.empty")}</p>
            ) : (
              <div className="col" style={{ gap: 12, marginTop: 12 }}>
                {phaseHistory.map((p, i) => {
                  const override = overrideReasonText(p.reasons);
                  return (
                    <div key={i} className="row-between" style={{ alignItems: "flex-start" }}>
                      <div>
                        <span className={`badge badge-p${p.stage}`}>
                          {t("stageBadge", { stage: p.stage, name: stageName(p.stage) })}
                        </span>
                        {p.needsReview && (
                          <span className="badge badge-warn" style={{ marginLeft: 6 }}>
                            {t("stageHistory.needsReview")}
                          </span>
                        )}
                        <p className="small muted" style={{ marginTop: 6, maxWidth: "40ch" }}>
                          {override === null ? t("stageHistory.assessment") : t("stageHistory.override")}
                        </p>
                        {override && (
                          <p className="small" style={{ marginTop: 2, maxWidth: "40ch" }}>
                            {t("stageHistory.overrideReason", { reason: override })}
                          </p>
                        )}
                      </div>
                      <span className="small faint tr" style={{ whiteSpace: "nowrap" }}>
                        {format.dateTime(new Date(p.assignedAt), { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card card-pad-lg">
            <h3 className="h-card">{t("stage.title")}</h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              {t("stage.intro")}
            </p>
            <ChangeStageForm patientProfileId={patient.patientProfileId} current={patient.stage} />
          </div>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
          <h3 className="h-card">{t("notes.title")}</h3>
          {notes.length === 0 ? (
            <p className="small muted mt-4">{t("notes.empty")}</p>
          ) : (
            <div className="col" style={{ gap: 14, marginTop: 12 }}>
              {notes.map((n) => (
                <div key={n.id} className="note">
                  <p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p>
                  <p className="small faint" style={{ marginTop: 6 }}>
                    {t("notes.by", {
                      name: n.authorName ?? t("notes.unknownAuthor"),
                      date: format.dateTime(new Date(n.createdAt), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
          <AddNoteForm patientProfileId={patient.patientProfileId} />
        </div>

        <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
          <h3 className="h-card">{t("sessions.title")}</h3>
          {sessions.length === 0 ? (
            <p className="small muted mt-4">{t("sessions.empty")}</p>
          ) : (
            <div className="tbl-wrap" style={{ marginTop: 12 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("sessions.columns.date")}</th>
                    <th>{t("sessions.columns.status")}</th>
                    <th>{t("sessions.columns.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const c = completionState(s);
                    return (
                      <tr key={s.date}>
                        <td>{utcDay(s.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td>
                          <span className={`badge ${c.cls}`}>{t(`sessions.status.${c.state}`)}</span>
                        </td>
                        <td className="small muted">{s.observationNote || t("sessions.noNote")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
