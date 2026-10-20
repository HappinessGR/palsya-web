import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../i18n/metadata";
import { requirePagePermission } from "../../src/lib/authz";
import { listClinicians, listPatients, notesThisWeek, summarise } from "../../src/lib/backoffice";
import { listPendingInvitations } from "../../src/lib/user-admin";
import { AttentionRow, Bars, Kpi, STAGE_COLOURS, StackBar } from "../components/backoffice/ui";
import { monthLabel } from "../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

/** Back office — Overview (legacy views-admin.js overview()). */
export default async function AdminOverviewPage() {
  await requirePagePermission("users:read");
  const t = await getTranslations("backoffice");
  const format = await getFormatter();
  const locale = await getLocale();

  const [patients, clinicians, notes, invitations] = await Promise.all([
    listPatients({ kind: "all" }),
    listClinicians(),
    notesThisWeek({ kind: "all" }),
    listPendingInvitations().catch(() => null), // Clerk unreachable — show a dash rather than failing the page.
  ]);
  const s = summarise(patients);
  const unassigned = patients.filter((p) => !p.clinicianId).length;
  const pendingClinicians = clinicians.filter((c) => c.status === "pending_verification").length;
  const n = (v: number) => format.number(v);

  const attention = [
    { n: s.needsReview, kind: "alert", icon: "alert", key: "review" },
    { n: s.safety, kind: "alert", icon: "shield", key: "safety" },
    { n: s.inactive, kind: "warn", icon: "clock", key: "inactive" },
    { n: unassigned, kind: "warn", icon: "users", key: "unassigned" },
    { n: pendingClinicians, kind: "info", icon: "stethoscope", key: "pendingClinicians" },
    { n: invitations?.length ?? 0, kind: "info", icon: "mail", key: "invitations" },
  ] as const;

  return (
    <>
      <div className="bo-kpis">
        <Kpi
          n={n(s.total)}
          label={t("admin.overview.kpi.activePatients")}
          delta={t("admin.overview.kpi.activePatientsDelta", { n: s.newByMonth.at(-1)?.n ?? 0 })}
          trend="up"
        />
        <Kpi
          n={n(clinicians.length)}
          label={t("admin.overview.kpi.clinicians")}
          delta={pendingClinicians ? t("admin.overview.kpi.cliniciansDelta", { n: pendingClinicians }) : undefined}
          trend="flat"
        />
        <Kpi
          n={s.meanAdherence === null ? t("common.dash") : t("common.percent", { n: s.meanAdherence })}
          label={t("admin.overview.kpi.adherence")}
        />
        <Kpi
          n={n(s.needsReview)}
          label={t("admin.overview.kpi.awaitingReview")}
          delta={unassigned ? t("admin.overview.kpi.awaitingReviewDelta", { n: unassigned }) : undefined}
          trend="down"
        />
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.overview.newPatients")}</h3>
          <div style={{ marginTop: 16 }}>
            <Bars data={s.newByMonth.map((m) => ({ l: monthLabel(m.month, locale), v: m.n }))} />
          </div>
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.overview.byStage")}</h3>
          <div style={{ marginTop: 20 }}>
            <StackBar
              parts={s.byStage.map((b) => ({ l: t("common.stageLabel", { n: b.stage }), v: b.n, colour: STAGE_COLOURS[b.stage - 1] }))}
              format={n}
            />
          </div>
          {s.unstaged > 0 && (
            <p className="small faint" style={{ marginTop: 16 }}>
              {t("admin.overview.unstagedNote", { n: s.unstaged })}
            </p>
          )}
        </div>
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.overview.needsAttention")}</h3>
          <div className="stack-sm" style={{ marginTop: 14 }}>
            {attention.some((a) => a.n > 0) ? (
              attention
                .filter((a) => a.n > 0)
                .map((a) => (
                  <AttentionRow
                    key={a.key}
                    kind={a.kind}
                    icon={a.icon}
                    title={t(`admin.overview.attn.${a.key}`, { n: a.n })}
                    sub={t(`admin.overview.attn.${a.key}Sub`)}
                  />
                ))
            ) : (
              <p className="small muted">{t("common.noneNeedAttention")}</p>
            )}
          </div>
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.overview.thisWeek")}</h3>
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>{t("admin.overview.kv.sessionsLogged")}</dt>
            <dd className="num">{n(s.sessions7d)}</dd>
            <dt>{t("admin.overview.kv.activePatients")}</dt>
            <dd className="num">{n(s.active7d)}</dd>
            <dt>{t("admin.overview.kv.newPatients")}</dt>
            <dd className="num">{n(s.new7d)}</dd>
            <dt>{t("admin.overview.kv.notesWritten")}</dt>
            <dd className="num">{n(notes)}</dd>
            <dt>{t("admin.overview.kv.pendingInvitations")}</dt>
            <dd className="num">{invitations === null ? t("common.dash") : n(invitations.length)}</dd>
          </dl>
        </div>
      </div>
    </>
  );
}
