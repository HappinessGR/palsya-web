import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listPatients, summarise, type BoPatient, type PatientFlag } from "../../../src/lib/backoffice";
import { Icon } from "../../components/Icon";
import { Kpi, StageBadge } from "../../components/backoffice/ui";
import { relDays, shortId } from "../../components/backoffice/format";
import { param } from "../shared";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

const FLAG_BADGE: Record<PatientFlag, string> = { review: "badge-brand", safety: "badge-warn", inactive: "badge-outline" };

/**
 * Back office — Patient oversight (legacy views-admin.js patients()). Staff
 * see initials and a short record id, never contact details. The legacy
 * modal is a server-rendered panel here, opened with ?p=<patient profile id>.
 */
export default async function AdminPatientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("patients:all:read");
  const sp = await searchParams;
  const q = (param(sp, "q") ?? "").trim();
  const t = await getTranslations("backoffice");
  const tp = await getTranslations("programme");
  const format = await getFormatter();

  const patients = await listPatients({ kind: "all" });
  const s = summarise(patients);
  const flagged = patients.filter((p) => p.flags.length > 0);
  const unassigned = patients.filter((p) => !p.clinicianId).length;
  const selected = patients.find((p) => p.patientProfileId === param(sp, "p")) ?? null;

  const needle = q.toLowerCase();
  const cohort = needle
    ? patients.filter((p) => shortId(p.patientProfileId).toLowerCase().includes(needle) || p.initials.toLowerCase().includes(needle))
    : patients;

  const stageName = (p: BoPatient) => (p.stage === null ? t("common.unstaged") : tp(`stages.${p.stage}.name`));
  const open = (p: BoPatient) => `/admin/patients?${new URLSearchParams({ ...(q ? { q } : {}), p: p.patientProfileId })}#patient`;

  return (
    <>
      <div className="note note-warn">
        <Icon name="shield" size={19} className="note-icon" />
        <div>{t.rich("admin.patients.accessNote", { b: (c) => <b>{c}</b> })}</div>
      </div>

      <div className="bo-kpis" style={{ marginTop: "var(--s-5)" }}>
        <Kpi n={format.number(s.total)} label={t("admin.patients.kpi.active")} />
        <Kpi n={format.number(s.flagged)} label={t("admin.patients.kpi.flagged")} />
        <Kpi n={s.meanAdherence === null ? t("common.dash") : t("common.percent", { n: s.meanAdherence })} label={t("admin.patients.kpi.adherence")} />
        <Kpi n={format.number(unassigned)} label={t("admin.patients.kpi.unassigned")} />
      </div>

      {selected && (
        <div className="card card-pad-lg bo-section" id="patient" style={{ borderColor: "var(--brand)" }}>
          <div className="card-hd">
            <h3>{t("admin.patients.detail.title", { name: selected.initials, id: shortId(selected.patientProfileId) })}</h3>
            <Link className="btn btn-sm btn-ghost" href={q ? `/admin/patients?q=${encodeURIComponent(q)}` : "/admin/patients"}>
              <Icon name="x" size={15} />
              {t("admin.patients.detail.close")}
            </Link>
          </div>
          <div className="note note-warn">
            <Icon name="shield" size={18} className="note-icon" />
            <div>{t.rich("admin.patients.detail.privacyNote", { b: (c) => <b>{c}</b> })}</div>
          </div>
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>{t("admin.patients.detail.stage")}</dt>
            <dd>{selected.stage === null ? t("common.unstaged") : `${selected.stage} — ${stageName(selected)}`}</dd>
            <dt>{t("admin.patients.detail.day")}</dt>
            <dd className="num">{selected.day}</dd>
            <dt>{t("admin.patients.detail.sessions28d")}</dt>
            <dd className="num">{t("common.percent", { n: selected.adherence })}</dd>
            <dt>{t("admin.patients.detail.confidence")}</dt>
            <dd>{selected.stageConfidence ? t(`admin.patients.detail.confidenceLevel.${selected.stageConfidence}`) : t("common.dash")}</dd>
            <dt>{t("admin.patients.detail.clinician")}</dt>
            <dd>{selected.clinicianName ?? t("admin.patients.unassigned")}</dd>
            <dt>{t("admin.patients.detail.lastActive")}</dt>
            <dd>{relDays(t, selected.daysSinceSession)}</dd>
          </dl>
          {selected.flags.map((f) => (
            <div className="note note-clinical" style={{ marginTop: 16 }} key={f}>
              <Icon name="stethoscope" size={18} className="note-icon" />
              <div>{t(`common.flagText.${f}`)}</div>
            </div>
          ))}
          <div className="row-wrap" style={{ marginTop: 18, justifyContent: "flex-end" }}>
            <Link className="btn" href="/admin/users?role=patient">
              {t("admin.patients.detail.manage")}
            </Link>
          </div>
        </div>
      )}

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("admin.patients.flaggedTitle")}</h3>
        </div>
        {flagged.length === 0 ? (
          <p className="small muted">{t("admin.patients.noFlagged")}</p>
        ) : (
          <div className="stack-sm">
            {flagged.map((p) => (
              <Link
                key={p.patientProfileId}
                href={open(p)}
                className="card card-pad-sm card-flat card-lift row-between bo-row-link"
                style={{ gap: 12, flexWrap: "wrap" }}
              >
                <div>
                  <div className="strong small">
                    {p.initials} <span className="muted">{shortId(p.patientProfileId)}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {t("admin.patients.rowMeta", {
                      stage: p.stage ?? t("common.dash"),
                      day: p.day,
                      clinician: p.clinicianName ?? t("admin.patients.unassigned"),
                    })}
                  </div>
                </div>
                <div className="row-wrap">
                  {p.flags.map((f) => (
                    <span key={f} className={`badge ${FLAG_BADGE[f]}`}>
                      {t(`common.flagBadge.${f}`)}
                    </span>
                  ))}
                  <Icon name="chevron-right" size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("admin.patients.cohort")}</h3>
          <form className="row-wrap" action="/admin/patients" method="get">
            <input
              className="input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("admin.patients.searchPlaceholder")}
              aria-label={t("admin.patients.searchPlaceholder")}
              style={{ width: 200 }}
            />
            <button className="btn btn-sm btn-ghost" type="submit">
              <Icon name="search" size={15} />
              {t("admin.patients.search")}
            </button>
            {q && (
              <Link className="btn btn-sm btn-quiet" href="/admin/patients">
                {t("admin.patients.clear")}
              </Link>
            )}
          </form>
        </div>
        {cohort.length === 0 ? (
          <p className="small muted">{q ? t("admin.patients.noMatch", { q }) : t("admin.patients.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.patients.col.patient")}</th>
                  <th>{t("admin.patients.col.stage")}</th>
                  <th className="num">{t("admin.patients.col.day")}</th>
                  <th className="num">{t("admin.patients.col.sessions28d")}</th>
                  <th>{t("admin.patients.col.clinician")}</th>
                  <th>{t("admin.patients.col.lastActive")}</th>
                </tr>
              </thead>
              <tbody>
                {cohort.map((p) => (
                  <tr key={p.patientProfileId}>
                    <td>
                      <Link className="btn btn-sm btn-quiet" href={open(p)} style={{ padding: "2px 6px" }}>
                        <span className="strong">{p.initials}</span>
                      </Link>
                      <div className="small muted">{shortId(p.patientProfileId)}</div>
                    </td>
                    <td>
                      <StageBadge stage={p.stage} name={stageName(p)} />
                    </td>
                    <td className="num">{p.day}</td>
                    <td className="num">{t("common.percent", { n: p.adherence })}</td>
                    <td className="small">{p.clinicianName ?? <span className="muted">{t("admin.patients.unassigned")}</span>}</td>
                    <td className="small muted">{relDays(t, p.daysSinceSession)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small faint" style={{ marginTop: 14 }}>
          {t("admin.patients.sortingNote")}
        </p>
      </div>
    </>
  );
}
