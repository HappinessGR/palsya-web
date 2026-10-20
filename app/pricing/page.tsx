import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { extras, faqGroups, money, plans, type Plan } from "../lib/content";
import { createResubscribeCheckoutSession, getBillingStatus } from "../../lib/billing/trial-subscription.service";
import { pageMetadata } from "../../i18n/metadata";
import { authorizeAction } from "../../src/lib/authz";
import { locales, type Locale } from "../../i18n/config";

export function generateMetadata() {
  return pageMetadata("pricing.meta");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type BillingStatus = Awaited<ReturnType<typeof getBillingStatus>>;

async function startCheckoutAction(formData: FormData) {
  "use server";
  const priceId = formData.get("priceId") as string;
  // Only patients buy plans; staff are sent back to their own dashboard.
  const authz = await authorizeAction("self:billing");
  if (!authz.ok) redirect(authz.error === "not_signed_in" ? "/sign-in" : "/me");

  const { url } = await createResubscribeCheckoutSession(
    authz.actor.clerkUserId,
    priceId,
    `${APP_URL}/dashboard?checkout=success`,
    `${APP_URL}/pricing?checkout=cancelled`,
  );
  if (url) redirect(url);
}

/** true = tick, false = dash; objects are rendered as text (counts / response times). */
type Cell = boolean | { consults: number } | { days: number } | { hours: number };

/** Row ids (text in pricing.table.rows), cells in plan order: app, guided, supported. */
const TABLE_ROWS: [string, ...Cell[]][] = [
  ["programme", true, true, true],
  ["guidance", true, true, true],
  ["scans", true, true, true],
  ["timeline", true, true, true],
  ["reports", true, true, true],
  ["knowledge", true, true, true],
  ["share", true, true, true],
  ["consults", false, { consults: 2 }, { consults: 6 }],
  ["notes", false, true, true],
  ["sameClinician", false, false, true],
  ["messages", false, false, true],
  ["scanReviews", false, false, true],
  ["support", { days: 1 }, { hours: 4 }, { hours: 4 }],
];

async function PlanCard({ plan, billing }: { plan: Plan; billing: BillingStatus | null }) {
  const t = await getTranslations("pricing");
  const locale = (await getLocale()) as Locale;
  const hasActiveAccess = billing?.status === "trialing" || billing?.status === "active";
  // i18n-ignore
  const btnClass = `btn btn-block${plan.best ? "" : " btn-ghost"}`;

  return (
    <div className={`price${plan.best ? " price-best" : ""}`}>
      {plan.best && <div className="price-tag">{t("card.mostChosen")}</div>}
      <div className="price-name">{t(`plans.${plan.id}.name`)}</div>
      <div className="price-amt">
        <b>{money(plan.price, locale)}</b>
        <span>{t("card.period", { months: plan.months })}</span>
      </div>
      <div className="price-day">{t("card.perDay", { price: money(plan.perDay, locale) })}</div>
      <ul className="price-list">
        {plan.features.map((f) => (
          <li key={f}>
            <Icon name="check" size={15} />
            <span>{t.rich(`plans.${plan.id}.features.${f}`, { b: (c) => <b>{c}</b> })}</span>
          </li>
        ))}
      </ul>
      <div className="price-for">{t(`plans.${plan.id}.forWho`)}</div>
      {hasActiveAccess ? (
        <Link className={btnClass} href="/dashboard">
          {t("card.goToDashboard")}
        </Link>
      ) : billing !== null ? (
        // Signed in, trial already ended (or never started) — no free trial this time.
        <form action={startCheckoutAction}>
          <input type="hidden" name="priceId" value={plan.stripePriceId} />
          <button type="submit" className={btnClass}>
            {t("card.subscribe")}
          </button>
        </form>
      ) : (
        <Link className={btnClass} href={`/sign-up?plan=${plan.id}`}>
          {t("card.startTrial", { days: extras.trialDays })}
        </Link>
      )}
    </div>
  );
}

export default async function PricingPage() {
  const { userId } = await auth();
  const billing = userId ? await getBillingStatus(userId) : null;

  const t = await getTranslations("pricing");
  const tFaq = await getTranslations("guides.faq");
  const format = await getFormatter();
  const locale = (await getLocale()) as Locale;

  const costGroup = faqGroups.find((g) => g.id === "cost");

  const cellText = (c: Exclude<Cell, boolean>) =>
    "consults" in c
      ? format.number(c.consults)
      : "days" in c
        ? t("table.days", { count: c.days })
        : t("table.hours", { count: c.hours });

  return (
    <>
      <SiteHeader />

      <section className="section-sm">
        <div className="wrap center">
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
            {t("hero.title")}
          </h1>
          <p className="lead" style={{ maxWidth: "56ch", margin: "18px auto 0" }}>
            {t("hero.lead")}
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-9)" }}>
        <div className="wrap">
          <div className="price-grid">
            {plans.map((p) => (
              <PlanCard plan={p} billing={billing} key={p.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-mid">
          <h2 className="display h-sec center">{t("table.title")}</h2>
          <div className="tbl-wrap" style={{ marginTop: 32 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("table.feature")}</th>
                  {plans.map((p) => (
                    <th className="center" key={p.id}>
                      {p.consults ? t("table.consultsHeader", { count: p.consults }) : t(`plans.${p.id}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => {
                  const [id, ...cells] = row;
                  return (
                    <tr key={id}>
                      <td>{t(`table.rows.${id}`, { count: locales.length })}</td>
                      {cells.map((c, i) => (
                        <td className="center" key={i}>
                          {c === true ? (
                            <span className="tick">
                              <Icon name="check" size={16} />
                            </span>
                          ) : c === false ? (
                            <span className="dash">—</span>
                          ) : (
                            <span className="strong">{cellText(c)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="wrap-mid">
          <div className="grid g2">
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("extras.extension.title")}</h3>
              <p className="mt-4">{t("extras.extension.body", { price: money(extras.extension.price, locale) })}</p>
            </div>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("extras.consult.title")}</h3>
              <p className="mt-4">{t("extras.consult.body", { price: money(extras.consult.price, locale) })}</p>
            </div>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("extras.referral.title")}</h3>
              <p className="mt-4">{t("extras.referral.body", { discount: extras.referralDiscount / 100 })}</p>
            </div>
            <div className="card card-pad-lg card-warm">
              <h3 className="h-card">{t("extras.reducedCost.title")}</h3>
              <p className="mt-4">{t("extras.reducedCost.body")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-read">
          <h2 className="display h-sec center">{t("faq.title")}</h2>
          <div className="stack" style={{ marginTop: 28 }}>
            {costGroup?.questions.map((q) => (
              <details className="acc" key={q}>
                <summary>
                  <span>{tFaq(`cost.items.${q}.q`)}</span>
                </summary>
                <div className="acc-body">
                  <p>
                    {tFaq(`cost.items.${q}.a`, {
                      app: money(plans[0].price, locale),
                      guided: money(plans[1].price, locale),
                      supported: money(plans[2].price, locale),
                      extension: money(extras.extension.price, locale),
                      consult: money(extras.consult.price, locale),
                      trialDays: extras.trialDays,
                      chargeDay: extras.trialDays + 1,
                    })}
                  </p>
                </div>
              </details>
            ))}
          </div>
          <p className="center" style={{ marginTop: 28 }}>
            <Link className="link-arrow" href="/faq">
              {t("faq.all")}
              <Icon name="arrow-right" size={16} />
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
