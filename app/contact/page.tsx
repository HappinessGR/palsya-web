import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { FaceIllustration } from "../components/FaceIllustration";
import { contactEmails, testimonials } from "../lib/content";
import { pageMetadata } from "../../i18n/metadata";
import type { Locale } from "../../i18n/config";
import { ContactForm } from "./ContactForm";

export function generateMetadata() {
  return pageMetadata("contact.meta");
}

const ADDRESSES = [
  { id: "hello", icon: "mail" },
  { id: "privacy", icon: "shield" },
  { id: "clinicians", icon: "stethoscope" },
] as const;

const TOPICS = ["camera", "tape", "plan", "data", "worried"] as const;

/** The featured quote: the first verified testimonial (same source as the home page). */
const featured = testimonials[0];

/**
 * Optional full-width photo between the testimonial and the closing band.
 * Drop a landscape image at this path to replace the illustration.
 */
const BANNER_PHOTO = "/images/contact-banner.jpg";
const hasBannerPhoto = fs.existsSync(
  path.join(process.cwd(), "public", BANNER_PHOTO),
);

/**
 * Layout: dark band with intro + contact info on the left and the form on the
 * right → testimonial card → answered-already FAQ → full-width banner →
 * dark closing band with the call to action.
 */
export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tl = await getTranslations("landing");
  const ts = await getTranslations("stories.testimonials");
  const locale = (await getLocale()) as Locale;

  return (
    <>
      <SiteHeader />

      <main id="main" className="contact-page">
        <section className="contact-band">
          <div className="wrap contact-band-grid">
            <div className="contact-intro">
              <h1 className="contact-h1">{t("hero.title")}</h1>
              <p className="contact-h2">{t("hero.subtitle")}</p>
              <p>{t("hero.lead")}</p>
              <p>{t("hero.lead2")}</p>

              <h2 className="contact-h1" style={{ marginTop: "var(--s-8)" }}>
                {t("info.title")}
              </h2>
              <ul className="contact-list">
                {ADDRESSES.map((a) => (
                  <li key={a.id}>
                    <Icon name={a.icon} size={18} />
                    <div>
                      <a href={`mailto:${contactEmails[a.id]}`}>
                        {contactEmails[a.id]}
                      </a>
                      <div className="contact-list-hint">
                        {t(`emails.${a.id}`)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="contact-urgent">
                <Icon name="alert" size={20} />
                <div>
                  <b>{t("urgent.strong")}</b> {t("urgent.body")}
                </div>
              </div>
            </div>

            <ContactForm defaultLang={locale} />
          </div>
        </section>

        <section className="section-sm">
          <div className="wrap">
            <figure className="contact-quote">
              <h2 className="contact-quote-title">{t("testimonial.title")}</h2>
              <blockquote>
                {tl("testimonials.quote", {
                  quote: ts(`${featured.id}.quote`),
                })}
              </blockquote>
              <figcaption>
                <b>{featured.who}</b>
                <span className="small muted">{ts(`${featured.id}.ctx`)}</span>
              </figcaption>
            </figure>

            <div className="wrap-read" style={{ marginTop: "var(--s-9)" }}>
              <h2 className="contact-quote-title">{t("answered")}</h2>
              <div className="stack-sm" style={{ marginTop: 22 }}>
                {TOPICS.map((id) => (
                  <details className="acc" key={id}>
                    <summary>
                      <span>{t(`topics.${id}.t`)}</span>
                    </summary>
                    <div className="acc-body">
                      <p>{t(`topics.${id}.b`)}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {hasBannerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- static decorative photo, full-bleed CSS crop
          <img
            className="contact-banner contact-banner-photo"
            src={BANNER_PHOTO}
            alt=""
          />
        ) : (
          <div
            className="contact-banner"
            role="img"
            aria-label={t("banner.alt")}
          >
            <FaceIllustration droop={0.75} side="left" size={170} />
            <Icon name="arrow-right" size={28} />
            <FaceIllustration droop={0.35} side="left" size={170} />
            <Icon name="arrow-right" size={28} />
            <FaceIllustration droop={0} side="left" size={170} />
          </div>
        )}

        <section className="contact-band contact-cta">
          <div className="wrap-mid center">
            <h2 className="contact-cta-title">{t("cta.title")}</h2>
            <p style={{ marginTop: 14 }}>{t("cta.lead")}</p>
            <Link
              className="btn btn-lg contact-submit"
              href="/sign-up"
              style={{ marginTop: 26 }}
            >
              {tl("startFree")}
              <Icon name="arrow-right" size={18} />
            </Link>
            <p className="small contact-location">
              <Icon name="globe" size={14} />
              {t("location")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
