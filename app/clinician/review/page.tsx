import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listPatients, scopeFor, summarise, type PatientFlag } from "../../../src/lib/backoffice";
import { Icon } from "../../components/Icon";
import { Kpi } from "../../components/backoffice/ui";
import { relDays } from "../../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.clinician.meta");
}

const FLAG_BADGE: Record<PatientFlag, string> = { review: "badge-brand", safety: "badge-warn", inactive: "badge-outline" };
const FLAG_ORDER: PatientFlag[] = ["review", "safety", "inactive"];

/**
 * Clinician portal — Review queue: the admin "Flagged for follow-up" list,
 * limited to this clinician's patients and shown with full names (an
 * assigned clinician may see identity; operations staff may not).
 */
export default async function ClinicianReviewPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("backoffice");
  const tp = await getTranslations("programme");
  const format = await getFormatter();

  const patients = await listPatients(scopeFor(actor));
  const s = summarise(patients);
  // Most urgent first: placements to confirm, then safety, then inactivity.
  const rank = (flags: PatientFlag[]) => Math.min(...flags.map((f) => FLAG_ORDER.indexOf(f)));
  const queue = patients.filter((p) => p.flags.length > 0).sort((a, b) => rank(a.flags) - rank(b.flags));

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={format.number(queue.length)} label={t("clinician.review.kpi.total")} />
        <Kpi n={format.number(s.needsReview)} label={t("clinician.review.kpi.review")} />
        <Kpi n={format.number(s.safety)} label={t("clinician.review.kpi.safety")} />
        <Kpi n={format.number(s.inactive)} label={t("clinician.review.kpi.inactive")} />
      </div>

      <div className="card card-pad-lg bo-section">
        <h3 className="h-card">{t("clinician.review.title")}</h3>
        {queue.length === 0 ? (
          <p className="small muted" style={{ marginTop: 12 }}>
            {t("clinician.review.empty")}
          </p>
        ) : (
          <div className="stack-sm" style={{ marginTop: 14 }}>
            {queue.map((p) => (
              <div className="card card-pad-sm card-flat" key={p.patientProfileId}>
                <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="strong small">{p.fullName}</div>
                    <div className="small muted" style={{ marginTop: 2 }}>
                      {t("clinician.review.rowMeta", {
                        stage: p.stage === null ? t("common.unstaged") : `${t("common.stageLabel", { n: p.stage })} · ${tp(`stages.${p.stage}.name`)}`,
                        day: p.day,
                        last: relDays(t, p.daysSinceSession),
                      })}
                    </div>
                  </div>
                  <div className="row-wrap">
                    {p.flags.map((f) => (
                      <span key={f} className={`badge ${FLAG_BADGE[f]}`}>
                        {t(`common.flagBadge.${f}`)}
                      </span>
                    ))}
                    <Link className="btn btn-sm" href={`/clinician/patients/${p.patientProfileId}`}>
                      {t("clinician.review.open")}
                      <Icon name="chevron-right" size={15} />
                    </Link>
                  </div>
                </div>
                <ul className="small muted" style={{ marginTop: 10, paddingLeft: "1.2em" }}>
                  {p.flags.map((f) => (
                    <li key={f}>{t(`common.flagText.${f}`)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="note note-clinical" style={{ marginTop: 18 }}>
          <Icon name="stethoscope" size={18} className="note-icon" />
          <div>{t.rich("clinician.review.note", { b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>
    </>
  );
}
