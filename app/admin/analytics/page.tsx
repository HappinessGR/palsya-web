import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listPatients } from "../../../src/lib/backoffice";
import { AnalyticsView } from "../../components/backoffice/analytics";
import { Bars, CardTitle, StackBar } from "../../components/backoffice/ui";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

/** Back office — Analytics (legacy views-admin.js analytics()). */
export default async function AdminAnalyticsPage() {
  await requirePagePermission("patients:all:read");
  const t = await getTranslations("backoffice");
  const patients = await listPatients({ kind: "all" });

  const demo = t("common.demo");
  const extra = (
    <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
      <div className="card card-pad-lg">
        <CardTitle demo={demo}>{t("admin.analytics.whereStop")}</CardTitle>
        <div style={{ marginTop: 16 }}>
          <Bars
            max={16}
            data={[
              { l: t("admin.analytics.dropoff.trial"), v: 12, colour: "var(--warm)" },
              { l: t("admin.analytics.dropoff.wk12"), v: 7, colour: "var(--warm)" },
              { l: t("admin.analytics.dropoff.wk34"), v: 4, colour: "var(--ink-4)" },
              { l: t("admin.analytics.dropoff.wk58"), v: 3, colour: "var(--ink-4)" },
              { l: t("admin.analytics.dropoff.wk912"), v: 3, colour: "var(--ink-4)" },
            ]}
          />
        </div>
        <p className="small faint" style={{ marginTop: 12 }}>
          {t("admin.analytics.dropoffNote")}
        </p>
      </div>

      <div className="card card-pad-lg">
        <CardTitle demo={demo}>{t("admin.analytics.scanQuality")}</CardTitle>
        <div style={{ marginTop: 20 }}>
          <StackBar
            parts={[
              { l: t("admin.analytics.quality.good"), v: 71, colour: "var(--ok)" },
              { l: t("admin.analytics.quality.fair"), v: 22, colour: "var(--warn)" },
              { l: t("admin.analytics.quality.poor"), v: 7, colour: "var(--alert)" },
            ]}
          />
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          {t("admin.analytics.lightingNote")}
        </p>
        <div className="divider" />
        <dl className="kv small">
          <dt>{t("admin.analytics.kv.retaken")}</dt>
          <dd className="num">83%</dd>
          <dt>{t("admin.analytics.kv.medianDuration")}</dt>
          <dd className="num">94s</dd>
          <dt>{t("admin.analytics.kv.abandoned")}</dt>
          <dd className="num">6%</dd>
        </dl>
      </div>
    </div>
  );

  return <AnalyticsView patients={patients} area="admin" extra={extra} />;
}
