import { Fragment } from "react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { pageMetadata } from "../../i18n/metadata";

export function generateMetadata() {
  return pageMetadata("about.meta");
}

const SECTIONS = ["whatWeAre", "whatWeAreNot", "funding", "refuse"] as const;

export default async function AboutPage() {
  const t = await getTranslations("about");
  const format = await getFormatter();

  const stats: { id: string; n: string }[] = [
    { id: "people", n: t("stats.people.value", { n: 14200 }) },
    // A year, not a quantity: no digit grouping.
    { id: "founded", n: String(2023) },
    { id: "languages", n: format.number(20) },
    { id: "dataSold", n: format.number(0) },
  ];

  return (
    <>
      <SiteHeader />

      <section className="section-sm">
        <div className="wrap-read">
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
            {t("hero.title")}
          </h1>

          <div className="prose" style={{ marginTop: 26 }}>
            <p>{t("story.p1")}</p>
            <p>{t("story.p2")}</p>
            <p>{t("story.p3")}</p>

            {SECTIONS.map((s) => (
              <Fragment key={s}>
                <h2>{t(`${s}.title`)}</h2>
                <p>{t(`${s}.body`)}</p>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap">
          <div className="grid g4">
            {stats.map((s) => (
              <div className="stat" key={s.id}>
                <div className="stat-n">{s.n}</div>
                <div className="stat-l">{t(`stats.${s.id}.label`)}</div>
                <div className="stat-d flat">{t(`stats.${s.id}.detail`, { count: 22 })}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="wrap center">
          <h2 className="display h-sec">{t("team.title")}</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            {t("team.lead")}
          </p>
          <div style={{ marginTop: 26 }}>
            <Link className="btn btn-lg btn-ghost" href="/team">
              {t("team.cta")}
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
