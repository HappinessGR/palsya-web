import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { complianceCounts, recentAudit, safetyFlagsThisMonth } from "../../../src/lib/backoffice";
import { Icon } from "../../components/Icon";
import { CardTitle, Kpi } from "../../components/backoffice/ui";
import { fromToday } from "../../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

// Legacy prototype figures (views-admin.js compliance()) — GDPR requests aren't tracked in the database yet.
const DEMO_GDPR = [
  ["DR-2026-0412", "access", -2, 28, "inProgress"],
  ["DR-2026-0411", "erasure", -4, 26, "completed"],
  ["DR-2026-0410", "portability", -6, 24, "completed"],
  ["DR-2026-0409", "rectification", -9, 21, "completed"],
  ["DR-2026-0408", "objection", -11, 19, "completed"],
] as const;

const POSTURE = [
  "dataResidency",
  "encryptionRest",
  "encryptionTransit",
  "facialImages",
  "retentionImages",
  "retentionRecords",
  "dpia",
  "subProcessors",
  "penTest",
  "dataSold",
] as const;

const LEVEL_BADGE: Record<string, string> = { urgent: "badge-alert", wait: "badge-warn", review: "badge-brand", action: "badge-outline" };

/** Back office — Compliance (legacy views-admin.js compliance()). */
export default async function AdminCompliancePage() {
  await requirePagePermission("audit:read");
  const t = await getTranslations("backoffice");
  const ta = await getTranslations("admin.audit");
  const format = await getFormatter();
  const demo = t("common.demo");

  const [counts, audit, flags] = await Promise.all([complianceCounts(), recentAudit(8), safetyFlagsThisMonth()]);
  const flagTotal = flags.reduce((s, f) => s + f.n, 0);
  const continued = flags.reduce((s, f) => s + f.continued, 0);
  const md = (offset: number) => format.dateTime(fromToday(offset), { day: "numeric", month: "short" });

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={format.number(counts.audit30d)} label={t("admin.compliance.kpi.audit30d")} />
        <Kpi n={format.number(flagTotal)} label={t("admin.compliance.kpi.flagsMonth")} />
        <Kpi n={format.number(continued)} label={t("admin.compliance.kpi.continued")} />
        <Kpi
          n={counts.staff ? t("common.percent", { n: Math.round((counts.staffMfa / counts.staff) * 100) }) : t("common.dash")}
          label={t("admin.compliance.kpi.staffMfa")}
        />
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <CardTitle demo={demo}>{t("admin.compliance.gdprQueue")}</CardTitle>
          <div className="tbl-wrap" style={{ marginTop: 14 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.compliance.col.reference")}</th>
                  <th>{t("admin.compliance.col.type")}</th>
                  <th>{t("admin.compliance.col.received")}</th>
                  <th>{t("admin.compliance.col.due")}</th>
                  <th>{t("admin.compliance.col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_GDPR.map(([ref, type, received, due, status]) => (
                  <tr key={ref}>
                    <td className="strong small">{ref}</td>
                    <td className="small">{t(`admin.compliance.reqType.${type}`)}</td>
                    <td className="small">{md(received)}</td>
                    <td className="small">{md(due)}</td>
                    <td>
                      <span className={`badge ${status === "completed" ? "badge-ok" : "badge-brand"}`}>{t(`admin.compliance.status.${status}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small faint" style={{ marginTop: 12 }}>
            {t("admin.compliance.slaNote")}
          </p>
        </div>

        <div className="card card-pad-lg">
          <CardTitle demo={demo}>{t("admin.compliance.posture")}</CardTitle>
          <div className="stack-sm" style={{ marginTop: 14 }}>
            {POSTURE.map((k) => (
              <div className="row-between" style={{ gap: 12, alignItems: "baseline" }} key={k}>
                <span className="small muted">{t(`admin.compliance.postureRows.${k}`)}</span>
                <span className="small strong tr">{t(`admin.compliance.postureRows.${k}Value`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <div className="card-hd">
          <h3>{t("admin.compliance.auditLog")}</h3>
          <Link className="link-arrow small" href="/admin/audit">
            {t("admin.compliance.fullLog")}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <p className="small muted">{t("admin.compliance.auditLogNote")}</p>
        {audit.length === 0 ? (
          <p className="small muted" style={{ marginTop: 14 }}>
            {t("admin.compliance.auditEmpty")}
          </p>
        ) : (
          <div className="tbl-wrap" style={{ marginTop: 14 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.compliance.col2.when")}</th>
                  <th>{t("admin.compliance.col2.who")}</th>
                  <th>{t("admin.compliance.col2.action")}</th>
                  <th>{t("admin.compliance.col2.record")}</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((r) => (
                  <tr key={r.id}>
                    <td className="small num">{format.dateTime(r.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="small strong">{r.actorName ?? t("admin.compliance.system")}</td>
                    <td className="small">{ta.has(`actions.${r.code}`) ? ta(`actions.${r.code}`) : r.code}</td>
                    <td className="small muted">{r.targetType ? (ta.has(`targets.${r.targetType}`) ? ta(`targets.${r.targetType}`) : r.targetType) : t("common.dash")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad-lg bo-section">
        <h3 className="h-card">{t("admin.compliance.safetyRegister")}</h3>
        {flags.length === 0 ? (
          <p className="small muted" style={{ marginTop: 14 }}>
            {t("admin.compliance.safetyEmpty")}
          </p>
        ) : (
          <div className="stack-sm" style={{ marginTop: 14 }}>
            {flags.map((f) => (
              <div className="card card-pad-sm card-flat" key={`${f.flagId}-${f.level}`}>
                <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className={`badge ${LEVEL_BADGE[f.level] ?? "badge-outline"}`}>{t(`admin.compliance.level.${f.level}`)}</span>
                    <span className="strong small">{f.title}</span>
                  </div>
                  <span className="badge badge-outline">{t("admin.compliance.safetyCount", { n: f.n, continued: f.continued })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="note note-safety" style={{ marginTop: 18 }}>
          <Icon name="alert" size={18} className="note-icon" />
          <div>{t.rich("admin.compliance.safetyNote", { n: flagTotal, b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>
    </>
  );
}
