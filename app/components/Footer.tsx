import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "./Icon";
import { BrandMark } from "./BrandMark";
import { articles } from "../lib/content";
import { locales } from "../../i18n/config";

const PRODUCT_LINKS = [
  { key: "howItWorks", href: "/how-it-works" },
  { key: "pricing", href: "/pricing" },
  { key: "stories", href: "/stories" },
  { key: "startFree", href: "/sign-up" },
  { key: "signIn", href: "/sign-in" },
] as const;

const COMPANY_LINKS = [
  { key: "about", href: "/about" },
  { key: "team", href: "/team" },
  { key: "contact", href: "/contact" },
  { key: "privacy", href: "/legal/privacy" },
  { key: "terms", href: "/legal/terms" },
  { key: "cookies", href: "/legal/cookies" },
] as const;

export async function Footer() {
  const t = await getTranslations("common");
  const tGuides = await getTranslations("guides.articles");

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link className="brand" href="/" aria-label={t("nav.home")}>
              <BrandMark size={30} />
              <span className="brand-name">{t("brand")}</span>
            </Link>
            <p className="small muted" style={{ marginTop: 14, maxWidth: "34ch" }}>
              {t("footer.tagline")}
            </p>
            <p className="small muted" style={{ marginTop: 14 }}>
              {t("footer.location", { year: 2023 })}
            </p>
          </div>

          <div>
            <h5>{t("footer.product")}</h5>
            <ul>
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{t(`footer.links.${l.key}`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>{t("footer.guides")}</h5>
            <ul>
              {articles.slice(0, 5).map((a) => (
                <li key={a.slug}>
                  <Link href={`/guides/${a.slug}`}>{tGuides(`${a.slug}.title`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>{t("footer.company")}</h5>
            <ul>
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{t(`footer.links.${l.key}`)}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="note note-safety" style={{ marginTop: "var(--s-8)" }}>
          <Icon name="alert" size={19} className="note-icon" />
          <div className="small">
            <b>{t("footer.disclaimerTitle")}</b> {t("medicalDisclaimer")}
          </div>
        </div>

        <div className="foot-note">
          <span>{t("footer.copyright", { year: 2026 })}</span>
          <div className="foot-trust">
            <span>
              <Icon name="shield" size={14} />
              {t("footer.trust.gdpr")}
            </span>
            <span>
              <Icon name="lock" size={14} />
              {t("footer.trust.eu")}
            </span>
            <span>
              <Icon name="globe" size={14} />
              {t("footer.trust.languages", { count: locales.length })}
            </span>
            <span>
              <Icon name="credit" size={14} />
              {t("footer.trust.stripe")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
