import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../i18n/metadata";
import { requirePagePermission } from "../../src/lib/authz";
import { listPatients, notesThisWeek, scopeFor, summarise } from "../../src/lib/backoffice";
import { Icon } from "../components/Icon";
import { AttentionRow, Bars, Kpi, STAGE_COLOURS, StackBar } from "../components/backoffice/ui";
import { monthLabel } from "../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.clinician.meta");
}

/** Clinician portal — Overview: the admin overview, scoped to this clinician's caseload. */
export default async function ClinicianOverviewPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("backoffice");
  const format = await getFormatter();
  const locale = await getLocale();
  const scope = scopeFor(actor);

  const [patients, notes] = await Promise.all([listPatients(scope), notesThisWeek(scope)]);
  const s = summarise(patients);
  const n = (v: number) => format.number(v);

  const attention = [
    { n: s.needsReview, kind: "alert", icon: "alert", key: "review" },
    { n: s.safety, kind: "alert", icon: "shield", key: "safety" },
    { n: s.inactive, kind: "warn", icon: "clock", key: "inactive" },
  ] as const;

  return (
    <>
      <div className="bo-kpis">
        <Kpi
          n={n(s.total)}
          label={t("clinician.overview.kpi.patients")}
          delta={t("clinician.overview.kpi.patientsDelta", { n: s.newByMonth.at(-1)?.n ?? 0 })}
          trend="up"
        />
        <Kpi n={n(s.needsReview)} label={t("clinician.overview.kpi.review")} />
        <Kpi n={n(s.inactive)} label={t("clinician.overview.kpi.inactive")} />
        <Kpi n={n(s.sessions7d)} label={t("clinician.overview.kpi.sessions")} />
      </div>

      {s.total === 0 && (
        <div className="note bo-section">
          <Icon name="info" size={18} className="note-icon" />
          <div>{t("clinician.overview.empty")}</div>
        </div>
      )}

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("clinician.overview.byStage")}</h3>
          <div style={{ marginTop: 20 }}>
            <StackBar
              parts={s.byStage.map((b) => ({ l: t("common.stageLabel", { n: b.stage }), v: b.n, colour: STAGE_COLOURS[b.stage - 1] }))}
              format={n}
            />
          </div>
          {s.unstaged > 0 && (
            <p className="small faint" style={{ marginTop: 16 }}>
              {t("clinician.overview.unstagedNote", { n: s.unstaged })}
            </p>
          )}
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("clinician.overview.newPatients")}</h3>
          <div style={{ marginTop: 16 }}>
            <Bars data={s.newByMonth.map((m) => ({ l: monthLabel(m.month, locale), v: m.n }))} />
          </div>
        </div>
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <div className="card-hd">
            <h3>{t("clinician.overview.needsAttention")}</h3>
            <Link className="link-arrow small" href="/clinician/review">
              {t("clinician.overview.openQueue")}
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          <div className="stack-sm">
            {attention.some((a) => a.n > 0) ? (
              attention
                .filter((a) => a.n > 0)
                .map((a) => (
                  <AttentionRow
                    key={a.key}
                    kind={a.kind}
                    icon={a.icon}
                    title={t(`clinician.overview.attn.${a.key}`, { n: a.n })}
                    sub={t(`clinician.overview.attn.${a.key}Sub`)}
                  />
                ))
            ) : (
              <p className="small muted">{t("common.noneNeedAttention")}</p>
            )}
          </div>
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("clinician.overview.thisWeek")}</h3>
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>{t("clinician.overview.kv.sessionsLogged")}</dt>
            <dd className="num">{n(s.sessions7d)}</dd>
            <dt>{t("clinician.overview.kv.activePatients")}</dt>
            <dd className="num">{n(s.active7d)}</dd>
            <dt>{t("clinician.overview.kv.notesWritten")}</dt>
            <dd className="num">{n(notes)}</dd>
            <dt>{t("clinician.overview.kv.adherence")}</dt>
            <dd className="num">{s.meanAdherence === null ? t("common.dash") : t("common.percent", { n: s.meanAdherence })}</dd>
          </dl>
        </div>
      </div>
    </>
  );
}
