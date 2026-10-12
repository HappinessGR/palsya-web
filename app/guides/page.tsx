import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { articles, fmtDateMD } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";
import type { Locale } from "../../i18n/config";

export function generateMetadata() {
  return pageMetadata("guides.meta");
}

export default async function GuidesPage() {
  const t = await getTranslations("guides");
  const locale = (await getLocale()) as Locale;

  return (
    <>
      <SiteHeader />

      <section className="section-sm">
        <div className="wrap">
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
            {t("hero.title")}
          </h1>
          <p className="lead" style={{ maxWidth: "62ch", marginTop: 18 }}>
            {t("hero.lead")}
          </p>

          <div className="kb-grid" style={{ marginTop: 44 }}>
            {articles.map((a, i) => (
              <Link className="card card-pad-lg card-lift kb-card" href={`/guides/${a.slug}`} key={a.slug}>
                <div className="kb-n">{String(i + 1).padStart(2, "0")}</div>
                <h3>{t(`articles.${a.slug}.title`)}</h3>
                <p>{t(`articles.${a.slug}.blurb`)}</p>
                <div className="kb-read">
                  {t("byline", {
                    minutes: a.read,
                    author: a.author ?? t("authorTeam"),
                    date: fmtDateMD(a.updated, locale),
                  })}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-read center">
          <div className="note note-safety" style={{ textAlign: "left" }}>
            <Icon name="alert" size={20} className="note-icon" />
            <div>{t.rich("safety", { b: (c) => <b>{c}</b> })}</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
