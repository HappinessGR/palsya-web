import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { pageMetadata } from "../../i18n/metadata";
import { contact, countryName, supportEmail } from "../../lib/contact";

export function generateMetadata() {
  return pageMetadata("contact.meta");
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const email = supportEmail();

  return (
    <>
      <SiteHeader />

      <section className="section-sm">
        <div className="wrap-read">
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
            {t("hero.title")}
          </h1>
          <p className="lead" style={{ marginTop: 16 }}>
            {t("hero.lead")}
          </p>
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap">
          <div className="grid g3">
            <div className="card card-pad-lg feat">
              <Icon name="mail" size={24} />
              <h2 className="card-title">{t("email.title")}</h2>
              <p className="muted">{t("email.body")}</p>
              <p>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            </div>

            <div className="card card-pad-lg feat">
              <Icon name="phone" size={24} />
              <h2 className="card-title">{t("phone.title")}</h2>
              <p className="muted">{t("phone.body")}</p>
              <p>
                <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
              </p>
            </div>

            <div className="card card-pad-lg feat">
              <Icon name="map-pin" size={24} />
              <h2 className="card-title">{t("address.title")}</h2>
              <address style={{ fontStyle: "normal", lineHeight: 1.6 }}>
                {tCommon("brand")}
                <br />
                {contact.street}
                <br />
                {contact.postalCodeCity}
                <br />
                {countryName(locale)}
              </address>
              <p>
                <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">
                  {t("address.map")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="wrap-read">
          <p>
            {t("faq.body")}{" "}
            <Link href="/faq">{t("faq.link")}</Link>
          </p>

          <div className="note note-safety" style={{ marginTop: "var(--s-6)" }}>
            <Icon name="alert" size={19} className="note-icon" />
            <div className="small">
              <b>{t("medical.title")}</b> {tCommon("medicalDisclaimer")}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
