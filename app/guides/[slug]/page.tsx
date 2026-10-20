import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../../components/SiteHeader";
import { Footer } from "../../components/Footer";
import { Icon } from "../../components/Icon";
import { articles, fmtDateMD } from "../../lib/content";
import { articleBody } from "../../lib/articles";
import type { Locale } from "../../../i18n/config";

// The FAQ has its own page (app/guides/faq); every other guide renders here.
const guide = (slug: string) => articles.find((a) => a.slug === slug && !a.faq);

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!guide(slug)) return {};
  const t = await getTranslations("guides.articles");
  const title = `${t(`${slug}.title`)} — Palsya`;
  const description = t(`${slug}.blurb`);
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function GuidePage(props: PageProps<"/guides/[slug]">) {
  const { slug } = await props.params;
  const article = guide(slug);
  const locale = (await getLocale()) as Locale;
  const content = article && articleBody(slug, locale);
  if (!article || !content) notFound();

  const t = await getTranslations("guides");
  const tCommon = await getTranslations("common");
  const author = article.author ?? t("authorTeam");
  const related = articles.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <>
      <SiteHeader />

      <section className="article-hd">
        <div className="wrap-read">
          <Link className="link-arrow" href="/guides" style={{ marginBottom: 18, display: "inline-flex" }}>
            <Icon name="arrow-left" size={16} />
            {t("faqPage.allGuides")}
          </Link>
          <h1>{t(`articles.${slug}.title`)}</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            {t(`articles.${slug}.blurb`)}
          </p>
          <div className="article-meta">
            <span>{t("article.writtenBy", { author })}</span>
            <span>{t("article.reviewedBy", { reviewer: article.reviewer })}</span>
            <span>{t("article.minRead", { minutes: article.read })}</span>
            <span>{t("article.updated", { date: fmtDateMD(article.updated, locale) })}</span>
          </div>
        </div>
      </section>

      <section className="article-body">
        <div className="wrap-read">
          <nav className="toc">
            <h4>{t("article.onThisPage")}</h4>
            <ol>
              {content.toc.map((heading, i) => (
                <li key={heading}>
                  <a href={`#s-${i + 1}`}>{heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Static, trusted HTML ported from the prototype (see app/lib/articles.ts). */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: content.body }} />

          <div className="signoff">
            <Icon name="info" size={20} />
            <div className="small">
              <b>{t("article.signoff", { author, reviewer: article.reviewer })}</b>
              <br />
              {tCommon("medicalDisclaimer")}
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap">
          <h2 className="display h-card">{t("article.keepReading")}</h2>
          <div className="kb-grid" style={{ marginTop: 24 }}>
            {related.map((r) => (
              <Link className="card card-pad-lg card-lift kb-card" href={`/guides/${r.slug}`} key={r.slug}>
                <h3>{t(`articles.${r.slug}.title`)}</h3>
                <p>{t(`articles.${r.slug}.blurb`)}</p>
                <div className="kb-read">{t("article.minRead", { minutes: r.read })}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
