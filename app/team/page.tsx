import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { extras, team } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";
import { localeRegions, type Locale } from "../../i18n/config";

export function generateMetadata() {
  return pageMetadata("team.meta");
}

const initials = (name: string) =>
  name
    .replace(/^Dr\.\s+/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export default async function TeamPage() {
  const t = await getTranslations("team");
  const locale = (await getLocale()) as Locale;
  const languageName = new Intl.DisplayNames([localeRegions[locale]], { type: "language" });
  const list = new Intl.ListFormat(localeRegions[locale], { style: "long", type: "unit" });

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
        <div className="wrap grid g2">
          {team.map((m) => {
            const key = `members.${m.id}` as const;
            return (
              <div className="card card-pad-lg" key={m.id}>
                <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                  <div className="avatar avatar-lg" aria-hidden="true">
                    {initials(m.name)}
                  </div>
                  <div className="grow">
                    <h2 className="h-card">{m.name}</h2>
                    <div className="small" style={{ color: "var(--brand-ink)", fontWeight: 600 }}>
                      {t(`${key}.role`)}
                    </div>
                    {t.has(`${key}.cred`) && (
                      <div className="small muted" style={{ marginTop: 2 }}>
                        {t(`${key}.cred`)}
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ marginTop: 16 }}>{t(`${key}.bio`)}</p>
                <dl className="kv" style={{ marginTop: 16 }}>
                  {m.regNo && t.has(`${key}.regulator`) && (
                    <div>
                      <dt>{t("registration")}</dt>
                      <dd>
                        {t(`${key}.regulator`)} {m.regNo}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>{t("consultLangs")}</dt>
                    <dd>{list.format(m.langs.map((l) => languageName.of(l) ?? l))}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-read center">
          <h2 className="display h-sec">{t("clinician.title")}</h2>
          <p className="lead" style={{ marginTop: 14 }}>
            {t("clinician.body", { pct: extras.referralDiscount / 100 })}
          </p>
          <div style={{ marginTop: 26 }}>
            <Link className="btn btn-lg btn-ghost" href="/contact">
              {t("clinician.link")}
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
