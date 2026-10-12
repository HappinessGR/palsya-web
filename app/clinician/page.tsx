import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { pageMetadata } from "../../i18n/metadata";
import { requirePagePermission } from "../../src/lib/authz";
import { listAssignedPatients } from "../../src/lib/clinician";

export async function generateMetadata() {
  return pageMetadata("clinician.meta");
}

/** Clinician home: the patients assigned to this clinician, and nobody else. */
export default async function ClinicianPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("clinician");
  const tAll = await getTranslations();
  const format = await getFormatter();
  const patients = await listAssignedPatients(actor);
  const firstName = actor.fullName.split(" ")[0];

  const day = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(`${iso}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : t("patients.none");

  return (
    <>
      <SiteHeader />
      <div className="page">
        <div className="greet">
          <h2>{firstName ? t("welcomeNamed", { name: firstName }) : t("welcome")}</h2>
          <p>{t("subtitle")}</p>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
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
