import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { pageMetadata } from "../../i18n/metadata";

export function generateMetadata() {
  return pageMetadata("howItWorks.meta");
}

/** Step ids → icon and paragraph ids, in display order (text in howItWorks.steps). */
const STEPS: { id: string; icon: string; paragraphs: string[] }[] = [
  { id: "assessment", icon: "assessment", paragraphs: ["p1", "p2", "p3"] },
  { id: "stage", icon: "phase", paragraphs: ["p1", "p2", "p3"] },
  { id: "session", icon: "play", paragraphs: ["p1", "p2", "p3"] },
  { id: "scan", icon: "camera", paragraphs: ["p1", "p2", "p3", "p4"] },
  { id: "timeline", icon: "trending-up", paragraphs: ["p1", "p2"] },
  { id: "clinician", icon: "stethoscope", paragraphs: ["p1", "p2"] },
];

export default async function HowItWorksPage() {
  const t = await getTranslations("howItWorks");

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
          {STEPS.map((step, i) => (
            <div className="card card-pad-lg" key={step.id}>
              <div className="row" style={{ gap: 14, alignItems: "center" }}>
                <div className="icon-tile">
                  <Icon name={step.icon} size={20} />
                </div>
                <div>
                  <div className="eyebrow">{t("stepLabel", { n: i + 1 })}</div>
                  <h2 className="h-card" style={{ marginTop: 2 }}>
                    {t(`steps.${step.id}.title`)}
                  </h2>
                </div>
              </div>
              <div className="prose" style={{ marginTop: 18 }}>
                {step.paragraphs.map((p) => (
                  <p key={p}>{t(`steps.${step.id}.${p}`)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-sm section-tint">
        <div className="wrap-read center">
          <h2 className="display h-sec">{t("notRight.title")}</h2>
          <p className="lead" style={{ marginTop: 14 }}>
            {t("notRight.lead")}
          </p>
          <div style={{ marginTop: 28 }}>
            <Link className="btn btn-lg" href="/sign-up">
              {t("notRight.cta")}
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
