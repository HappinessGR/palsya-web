import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { stories, testimonials, endorsements, press, fmtMonthYear } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";
import type { Locale } from "../../i18n/config";

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

function Stars({ n, label }: { n: number; label: string }) {
  const s = Array.from({ length: 5 }, (_, i) => (i < Math.round(n) ? "★" : "☆")).join("");
  return (
    <span className="stars" aria-label={label}>
      {s}
    </span>
  );
}

export default async function StoriesPage() {
  const t = await getTranslations("stories");
  const locale = (await getLocale()) as Locale;

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
        <div className="wrap stack-lg">
          {stories.map((s) => (
            <div className="card card-pad-lg" key={s.id}>
              <div className="row-wrap" style={{ gap: 14 }}>
                <div className="avatar avatar-lg avatar-warm" aria-hidden="true">
                  {initials(s.name)}
                </div>
                <div>
                  <h2 className="h-card">{t("story.title", { name: s.name, where: t(`items.${s.id}.where`) })}</h2>
                  <div className="small muted">
                    {t("story.meta", { dx: t(`items.${s.id}.dx`), week: s.startedWeek, months: s.months })}
                  </div>
                </div>
              </div>
              <p className="lead" style={{ marginTop: 20 }}>
                {t(`items.${s.id}.summary`)}
              </p>
              <p style={{ marginTop: 16 }}>{t(`items.${s.id}.body`)}</p>
              <blockquote
                className="quote"
                style={{ margin: "22px 0 0", paddingLeft: 20, borderLeft: "3px solid var(--warm)" }}
              >
                {t("quoted", { text: t(`items.${s.id}.quote`) })}
              </blockquote>
            </div>
          ))}
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap">
          <h2 className="display h-sec">{t("reviews.title")}</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("reviews.lead")}
          </p>
          <div className="grid g3" style={{ marginTop: 32 }}>
            {testimonials.map((tm) => (
              <div className="card card-pad-lg testi" key={tm.id}>
                <div style={{ marginBottom: 12 }}>
                  <Stars n={tm.stars} label={t("reviews.stars", { n: tm.stars, max: 5 })} />
                </div>
                <p className="testi-q">{t("quoted", { text: t(`testimonials.${tm.id}.quote`) })}</p>
                <div className="testi-meta">
                  <div className="testi-who">{tm.who}</div>
                  <div className="testi-ctx">{t(`testimonials.${tm.id}.ctx`)}</div>
                  <span className="verified">
                    <Icon name="check" size={12} />
                    {t("reviews.verified")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="wrap">
          <h2 className="display h-sec">{t("clinicians.title")}</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("clinicians.lead")}
          </p>
          <div className="grid g3" style={{ marginTop: 32 }}>
            {endorsements.map((x) => (
              <div className="card card-pad-lg testi" key={x.id}>
                <div className="icon-tile icon-tile-sm">
                  <Icon name="stethoscope" size={18} />
                </div>
                <p className="testi-q" style={{ marginTop: 16, fontSize: "var(--t-md)" }}>
                  {t("quoted", { text: t(`endorsements.${x.id}.quote`) })}
                </p>
                <div className="testi-meta">
                  <div className="testi-who">{x.name}</div>
                  <div className="testi-ctx">
                    {t("clinicians.ctx", {
                      role: t(`endorsements.${x.id}.role`),
                      where: t(`endorsements.${x.id}.where`),
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-mid">
          <h2 className="display h-sec">{t("pressSection.title")}</h2>
          <div className="stack" style={{ marginTop: 28 }}>
            {press.map((p) => (
              <div className="card card-pad-sm row-between" style={{ gap: 16, flexWrap: "wrap" }} key={p.id}>
                <div>
                  <div className="strong">{t(`press.${p.id}.headline`)}</div>
                  <div className="small muted">
                    {t("pressSection.meta", { pub: p.pub, date: fmtMonthYear(p.when, locale) })}
                  </div>
                </div>
                <span className="badge badge-outline">{t(`press.${p.id}.kind`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
