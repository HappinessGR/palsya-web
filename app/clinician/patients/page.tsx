import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listPatients, scopeFor, type PatientFlag } from "../../../src/lib/backoffice";
import { listAssignedPatients } from "../../../src/lib/clinician";

export async function generateMetadata() {
  return pageMetadata("clinician.meta");
}

const FLAG_BADGE: Record<PatientFlag, string> = { review: "badge-brand", safety: "badge-warn", inactive: "badge-outline" };

/** My patients: the patients assigned to this clinician, and nobody else. */
export default async function ClinicianPatientsPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("clinician");
  const tAll = await getTranslations();
  const tb = await getTranslations("backoffice");
  const format = await getFormatter();
  const [patients, caseload] = await Promise.all([listAssignedPatients(actor), listPatients(scopeFor(actor))]);
  const flagsById = new Map(caseload.map((p) => [p.patientProfileId, p.flags]));

  const day = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(`${iso}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : t("patients.none");

  return (
    <>
      <div>
        <div className="card card-pad-lg">
          <div className="row-between" style={{ flexWrap: "wrap", gap: 8 }}>
            <h3 className="h-card">{t("patients.title")}</h3>
            {patients.length > 0 && <span className="small muted">{t("patients.count", { count: patients.length })}</span>}
          </div>

          {patients.length === 0 ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontWeight: 600 }}>{t("patients.emptyTitle")}</p>
              <p className="small muted" style={{ marginTop: 4 }}>
                {t("patients.emptyBody")}
              </p>
            </div>
          ) : (
            <div className="tbl-wrap" style={{ marginTop: 12 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("patients.columns.name")}</th>
                    <th>{t("patients.columns.email")}</th>
                    <th>{t("patients.columns.stage")}</th>
                    <th>{t("patients.columns.onset")}</th>
                    <th>{t("patients.columns.lastSession")}</th>
                    <th>{tb("clinician.review.title")}</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.patientProfileId}>
                      <td>
                        <Link
                          href={`/clinician/patients/${p.patientProfileId}`}
                          aria-label={t("patients.open", { name: p.fullName })}
                          style={{ fontWeight: 600 }}
                        >
                          {p.fullName}
                        </Link>
                      </td>
                      <td className="small muted">{p.email}</td>
                      <td>
                        {p.stage ? (
                          <span className={`badge badge-p${p.stage}`}>
                            {t("patient.stageBadge", {
                              stage: p.stage,
                              name: tAll(`programme.stages.${Math.min(5, Math.max(1, p.stage))}.name`),
                            })}
                          </span>
                        ) : (
                          <span className="badge badge-outline">{t("patients.noStage")}</span>
                        )}
                      </td>
                      <td className="small">{day(p.onsetDate)}</td>
                      <td className="small">{day(p.lastSessionDate)}</td>
                      <td>
                        <div className="row-wrap" style={{ gap: 6 }}>
                          {(flagsById.get(p.patientProfileId) ?? []).map((f) => (
                            <span key={f} className={`badge ${FLAG_BADGE[f]}`}>
                              {tb(`common.flagBadge.${f}`)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
