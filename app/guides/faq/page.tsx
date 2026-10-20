import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../../components/SiteHeader";
import { Footer } from "../../components/Footer";
import { Icon } from "../../components/Icon";
import { articles, extras, faqGroups, fmtDateMD, money, plans } from "../../lib/content";
import { pageMetadata } from "../../../i18n/metadata";
import type { Locale } from "../../../i18n/config";

export function generateMetadata() {
  return pageMetadata("guides.faqPage.meta");
}

export default async function FaqPage() {
  const t = await getTranslations("guides");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as Locale;

  const article = articles.find((a) => a.slug === "faq")!;
  // Placeholders used by the cost answers (same values as on /pricing).
  const values = {
    app: money(plans[0].price, locale),
    guided: money(plans[1].price, locale),
    supported: money(plans[2].price, locale),
    extension: money(extras.extension.price, locale),
    consult: money(extras.consult.price, locale),
    trialDays: extras.trialDays,
    chargeDay: extras.trialDays + 1,
  };

  return (
    <>
      <SiteHeader />

      <section className="article-hd">
        <div className="wrap-read">
          <Link className="link-arrow" href="/guides" style={{ marginBottom: 18, display: "inline-flex" }}>
            <Icon name="arrow-left" size={16} />
            {t("faqPage.allGuides")}
          </Link>
          <h1>{t("articles.faq.title")}</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            {t("articles.faq.blurb")}
          </p>
          <div className="article-meta">
            <span>
              {t("byline", {
                minutes: article.read,
                author: article.author ?? t("authorTeam"),
                date: fmtDateMD(article.updated, locale),
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="article-body">
        <div className="wrap-read">
          {faqGroups.map((g) => (
            <div key={g.id}>
              <h2 className="display" style={{ fontSize: "var(--t-2xl)", margin: "40px 0 16px" }}>
                {t(`faq.${g.id}.title`)}
              </h2>
              {g.questions.map((q) => (
                <details className="acc" key={q}>
                  <summary>
                    <span>{t(`faq.${g.id}.items.${q}.q`)}</span>
                  </summary>
                  <div className="acc-body">
                    <p>{t(`faq.${g.id}.items.${q}.a`, values)}</p>
                  </div>
                </details>
              ))}
            </div>
          ))}

          <div className="signoff">
            <Icon name="info" size={20} />
            <div className="small">{tCommon("medicalDisclaimer")}</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
