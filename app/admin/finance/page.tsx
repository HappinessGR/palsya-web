import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import type { Locale } from "../../../i18n/config";
import { requirePagePermission } from "../../../src/lib/authz";
import { subscriptionCounts } from "../../../src/lib/backoffice";
import { money, plans } from "../../lib/content";
import { Icon } from "../../components/Icon";
import { Bars, CardTitle, Kpi, StackBar } from "../../components/backoffice/ui";
import { fromToday, monthLabel } from "../../components/backoffice/format";

export async function generateMetadata() {
  return pageMetadata("backoffice.admin.meta");
}

// Legacy prototype figures (views-admin.js finance()) — payment history isn't read from Stripe yet.
const DEMO_REVENUE_K = [131, 117, 146, 139, 125, 152];
const DEMO_TX = [
  ["INV-2026-88412", 0, "subscription", "app2", 129, "paid"],
  ["INV-2026-88411", -1, "subscription", "appOnly", 89, "paid"],
  ["INV-2026-88410", -1, "extraConsult", null, 49, "paid"],
  ["INV-2026-88409", -2, "subscription", "app6", 179, "paid"],
  ["INV-2026-88408", -2, "monthlyExt", null, 29, "paid"],
  ["CRN-2026-00214", -3, "refund", "app2", -129, "refunded"],
  ["INV-2026-88406", -3, "subscriptionReferral", "app2", 109.65, "paid"],
] as const;

const PLAN_COLOURS: Record<string, string> = { app: "var(--p1)", guided: "var(--p2)", supported: "var(--p3)" };

/** Back office — Finance (legacy views-admin.js finance()). */
export default async function AdminFinancePage() {
  await requirePagePermission("users:read");
  const t = await getTranslations("backoffice");
  const format = await getFormatter();
  const locale = (await getLocale()) as Locale;
  const demo = t("common.demo");

  const counts = await subscriptionCounts();
  const total = (...statuses: string[]) => counts.filter((c) => statuses.includes(c.status)).reduce((s, c) => s + c.n, 0);
  const planOf = (priceId: string) => plans.find((p) => p.stripePriceId && p.stripePriceId === priceId) ?? null;

  // Estimated: each paying subscription's plan price, annualised over its term length.
  const runRate = counts
    .filter((c) => c.status === "active")
    .reduce((sum, c) => {
      const plan = planOf(c.priceId);
      return plan ? sum + c.n * plan.price * (12 / plan.months) : sum;
    }, 0);

  const mix = new Map<string, number>();
  for (const c of counts.filter((c) => c.status === "active" || c.status === "trialing")) {
    const key = planOf(c.priceId)?.id ?? "other";
    mix.set(key, (mix.get(key) ?? 0) + c.n);
  }
  const mixParts = [...plans.map((p) => p.id), "other"]
    .filter((id) => mix.has(id))
    .map((id) => {
      const plan = plans.find((p) => p.id === id);
      return {
        l: plan ? t(`admin.finance.plan.${plan.id}`, { price: money(plan.price, locale) }) : t("admin.finance.otherPlan"),
        v: mix.get(id)!,
        colour: PLAN_COLOURS[id] ?? "var(--ink-4)",
      };
    });

  const now = new Date();
  const months = DEMO_REVENUE_K.map((_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (DEMO_REVENUE_K.length - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const day = (offset: number) => format.dateTime(fromToday(offset), { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="bo-kpis">
        <Kpi n={format.number(total("active"))} label={t("admin.finance.kpi.active")} />
        <Kpi n={format.number(total("trialing"))} label={t("admin.finance.kpi.trialing")} />
        <Kpi n={format.number(total("past_due", "unpaid", "incomplete"))} label={t("admin.finance.kpi.pastDue")} />
        <Kpi n={money(runRate, locale)} label={t("admin.finance.kpi.runRate")} delta={t("admin.finance.kpi.runRateSub")} />
      </div>

      <div className="grid g2 bo-section" style={{ alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("admin.finance.planMix")}</h3>
          <div style={{ marginTop: 20 }}>
            {mixParts.length ? <StackBar parts={mixParts} format={(n) => format.number(n)} /> : <p className="small muted">{t("admin.finance.noSubscriptions")}</p>}
          </div>
          <p className="small faint" style={{ marginTop: 16 }}>
            {t("admin.finance.planMixNote")}
          </p>
        </div>

        <div className="card card-pad-lg">
          <CardTitle demo={demo}>{t("admin.finance.revenueByMonth")}</CardTitle>
          <div style={{ marginTop: 16 }}>
            <Bars data={DEMO_REVENUE_K.map((v, i) => ({ l: monthLabel(months[i], locale), v }))} />
          </div>
          <p className="small faint" style={{ marginTop: 12 }}>
            {t("admin.finance.revenueNote")}
          </p>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <CardTitle demo={demo}>{t("admin.finance.recentTx")}</CardTitle>
        <div className="tbl-wrap" style={{ marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("admin.finance.col.reference")}</th>
                <th>{t("admin.finance.col.date")}</th>
                <th>{t("admin.finance.col.type")}</th>
                <th>{t("admin.finance.col.plan")}</th>
                <th className="num">{t("admin.finance.col.amount")}</th>
                <th>{t("admin.finance.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TX.map(([ref, offset, type, plan, amount, status]) => (
                <tr key={ref}>
                  <td className="strong small">{ref}</td>
                  <td className="small">{day(offset)}</td>
                  <td className="small">{t(`admin.finance.txType.${type}`)}</td>
                  <td className="small">{plan ? t(`admin.finance.planName.${plan}`) : t("common.dash")}</td>
                  <td className="num">{money(amount, locale)}</td>
                  <td>
                    <span className={`badge ${status === "paid" ? "badge-ok" : "badge-warn"}`}>{t(`admin.finance.status.${status}`)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="note" style={{ marginTop: 18 }}>
          <Icon name="credit" size={18} className="note-icon" />
          <div>{t("admin.finance.stripeNote")}</div>
        </div>
      </div>

      <div className="card card-pad-lg bo-section">
        <CardTitle demo={demo}>{t("admin.finance.reducedCost")}</CardTitle>
        <p className="small muted mt-4">{t("admin.finance.reducedCostNote")}</p>
        <div className="grid g3" style={{ marginTop: 18 }}>
          <div className="stat">
            <div className="stat-n">40</div>
            <div className="stat-l">{t("admin.finance.stat.placesPerMonth")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">34</div>
            <div className="stat-l">{t("admin.finance.stat.allocated")}</div>
          </div>
          <div className="stat">
            <div className="stat-n">100%</div>
            <div className="stat-l">{t("admin.finance.stat.approved")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
