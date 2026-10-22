import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { articles, guideHref } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("guides.meta");
}

export default async function GuidesPage() {
  const t = await getTranslations("guides");
  const tArticles = await getTranslations("guides.articles");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-sm">
          <div className="wrap-read">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
              {t("hero.title")}
            </h1>
            <p className="lead" style={{ marginTop: 18 }}>
              {t("hero.lead")}
            </p>
          </div>
        </section>

        <section className="section-sm section-tint">
          <div className="wrap">
            <div className="kb-grid">
              {articles.map((article) => (
                <Link className="card card-pad-lg card-lift kb-card" href={guideHref(article)} key={article.slug}>
                  <h2 className="h-card">{tArticles(`${article.slug}.title`)}</h2>
                  <p>{tArticles(`${article.slug}.blurb`)}</p>
                  <span className="link-arrow">
                    {article.faq ? t("faqPage.allGuides") : t("article.keepReading")}
                    <Icon name="arrow-right" size={16} />
                  </span>
                </Link>
              ))}
            </div>

            <div className="note note-safety" style={{ marginTop: "var(--s-8)" }}>
              <Icon name="alert" size={19} className="note-icon" />
              <div className="small">{t.rich("safety", { b: (chunks) => <b>{chunks}</b> })}</div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
