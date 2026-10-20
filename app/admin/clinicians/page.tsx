import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listClinicians, listPatients } from "../../../src/lib/backoffice";
import { Icon } from "../../components/Icon";
import { CardTitle, Kpi } from "../../components/backoffice/ui";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

/** Back office — Clinicians (legacy views-admin.js clinicians()). */
export default async function AdminCliniciansPage() {
  await requirePagePermission("users:read");
  const t = await getTranslations("backoffice");
  const format = await getFormatter();

  const [clinicians, patients] = await Promise.all([listClinicians(), listPatients({ kind: "all" })]);
  const patientsBy = new Map<string, number>();
  for (const p of patients) if (p.clinicianId) patientsBy.set(p.clinicianId, (patientsBy.get(p.clinicianId) ?? 0) + 1);
  const assigned = patients.filter((p) => p.clinicianId).length;
  const pending = clinicians.filter((c) => c.status === "pending_verification").length;
  const active = clinicians.filter((c) => c.status === "active").length;
  const perClinician = active ? Math.round((assigned / active) * 10) / 10 : null;
  const day = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={format.number(clinicians.length)} label={t("admin.clinicians.kpi.count")} />
        <Kpi n={format.number(pending)} label={t("admin.clinicians.kpi.awaitingVerification")} />
        <Kpi n={format.number(assigned)} label={t("admin.clinicians.kpi.assigned")} />
        <Kpi n={perClinician === null ? t("common.dash") : format.number(perClinician)} label={t("admin.clinicians.kpi.perClinician")} />
      </div>

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("admin.clinicians.directory")}</h3>
          <Link className="btn btn-sm" href="/admin/invite">
            <Icon name="plus" size={15} />
            {t("admin.clinicians.invite")}
          </Link>
        </div>
        {clinicians.length === 0 ? (
          <p className="small muted">{t("admin.clinicians.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.clinicians.col.clinician")}</th>
                  <th>{t("admin.clinicians.col.registration")}</th>
                  <th>{t("admin.clinicians.col.institution")}</th>
                  <th className="num">{t("admin.clinicians.col.patients")}</th>
                  <th>{t("admin.clinicians.col.joined")}</th>
                  <th>{t("admin.clinicians.col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {clinicians.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="strong">{c.fullName || c.email}</div>
                      <div className="small muted">{c.title ?? c.email}</div>
                    </td>
                    <td className="small">{c.registrationNumber ?? <span className="muted">{t("admin.clinicians.noRegistration")}</span>}</td>
                    <td className="small">{c.institution ?? t("common.dash")}</td>
                    <td className="num">{format.number(patientsBy.get(c.id) ?? 0)}</td>
                    <td className="small muted">{day(c.createdAt)}</td>
                    <td>
                      {c.status === "active" ? (
                        <span className="badge badge-ok">
                          <Icon name="check" size={12} />
                          {t("admin.clinicians.verified")}
                        </span>
                      ) : c.status === "suspended" ? (
                        <span className="badge badge-outline">{t("admin.clinicians.suspended")}</span>
                      ) : (
                        <Link className="btn btn-sm" href="/admin/users?role=clinician">
                          {t("admin.clinicians.review")}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="note note-clinical" style={{ marginTop: 18 }}>
          <Icon name="shield" size={18} className="note-icon" />
          <div>{t.rich("admin.clinicians.verificationNote", { b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <CardTitle demo={t("common.demo")}>{t("admin.clinicians.quality")}</CardTitle>
        <p className="small muted mt-4">{t("admin.clinicians.qualityNote")}</p>
        <div className="grid g3" style={{ marginTop: 20 }}>
          <div className="stat">
            <div className="stat-n">92%</div>
            <div className="stat-l">{t("admin.clinicians.stat.specificPlan")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">88%</div>
            <div className="stat-l">{t("admin.clinicians.stat.understoodSituation")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">2.1%</div>
            <div className="stat-l">{t("admin.clinicians.stat.escalated")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
