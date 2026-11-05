import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { stories } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";
import { localeRegions, type Locale } from "../../i18n/config";

export function generateMetadata() {
  return pageMetadata("stories.meta");
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function StoriesPage() {
  const t = await getTranslations("stories");
  const format = await getFormatter();
  const locale = (await getLocale()) as Locale;
  const countryName = new Intl.DisplayNames([localeRegions[locale]], { type: "region" });

  return (
    <>
      <SiteHeader />

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

      <section className="section-sm">
        <div className="wrap-read stack-lg">
          {stories.map((s) => (
            <article className="card card-pad-lg" key={s.id}>
              <div className="row-wrap" style={{ gap: 14 }}>
                <div className="avatar avatar-lg avatar-warm" aria-hidden="true">
                  {initials(s.name)}
                </div>
                <div>
                  <h2 className="h-card">{s.name}</h2>
                  <div className="small muted">
                    {t("itemMeta", {
                      country: countryName.of(s.country) ?? s.country,
                      date: format.dateTime(new Date(`${s.date}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" }),
                    })}
                  </div>
                </div>
              </div>
              <div className="stack" style={{ marginTop: 20 }}>
                {Array.from({ length: s.paragraphs }, (_, i) => (
                  <p key={i}>{t(`items.${s.id}.p${i + 1}`)}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
