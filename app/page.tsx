import Link from "next/link";
import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "./components/SiteHeader";
import { Footer } from "./components/Footer";
import { FaceIllustration } from "./components/FaceIllustration";
import { Icon } from "./components/Icon";
import { articles, extras, fmtDateMD, money, plans, testimonials, type Plan } from "./lib/content";
import { stages } from "./lib/programme";
import { pageMetadata } from "../i18n/metadata";
import { redirectSignedInToDashboard } from "../src/lib/authz";
import { locales, type Locale } from "../i18n/config";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("landing.meta");
}

// Ported section-for-section from the legacy prototype's home view
// (assets/js/views-public.js V.home) so this page matches the reference app.
// Links to per-guide pages point at /guides until those pages exist.

function Stars({ n }: { n: number }) {
  const t = useTranslations("landing");
  const filled = Math.round(n);
  return (
    <span className="stars" aria-label={t("stars", { n })}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}

function StartFree() {
  const t = useTranslations("landing");
  return (
    <Link className="btn btn-lg" href="/sign-up">
      {t("startFree")}
      <Icon name="arrow-right" size={18} />
    </Link>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const t = useTranslations("landing.pricing");
  const tp = useTranslations(`pricing.plans.${plan.id}`);
  const tf = useTranslations(`pricing.plans.${plan.id}.features`);
  const locale = useLocale() as Locale;
  return (
    <div className={plan.best ? "price price-best" : "price"}>
      {plan.best && <div className="price-tag">{t("mostChosen")}</div>}
      <div className="price-name">{tp("name")}</div>
      <div className="price-amt">
        <b>{money(plan.price, locale)}</b>
        <span>{t("period", { months: plan.months })}</span>
      </div>
      <div className="price-day">{t("perDay", { price: money(plan.perDay, locale) })}</div>
      <ul className="price-list">
        {plan.features.map((f) => (
          <li key={f}>
            <Icon name="check" size={15} />
            {/* Feature text may carry <b> markup (pricing.plans.<id>.features). */}
            <span>{tf.rich(f, { b: (c) => <b>{c}</b> })}</span>
          </li>
        ))}
      </ul>
      <div className="price-for">{tp("forWho")}</div>
      <Link className={plan.best ? "btn btn-block" : "btn btn-ghost btn-block"} href={`/sign-up?plan=${plan.id}`}>
        {t("cta")}
      </Link>
    </div>
  );
}

export default async function Home() {
  // Signed-in users skip the marketing page and land on their own dashboard.
  await redirectSignedInToDashboard();
  const t = await getTranslations("landing");
  const tg = await getTranslations("guides.articles");
  const ts = await getTranslations("stories.testimonials");
  const tst = await getTranslations("programme.stages");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const locale = (await getLocale()) as Locale;
  const score = (n: number) => format.number(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const b = (c: React.ReactNode) => <b>{c}</b>;
  const bNum = (c: React.ReactNode) => <b className="num">{c}</b>;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">{t("hero.eyebrow")}</p>
              <h1>{t.rich("hero.title", { em: (c) => <em>{c}</em> })}</h1>
              <p className="hero-lead">{t("hero.lead")}</p>
              <div className="hero-cta">
                <StartFree />
                <Link className="btn btn-lg btn-ghost" href="/how-it-works">
                  {t("hero.howItWorks")}
                </Link>
              </div>
              <div className="hero-reassure">
                <span>
                  <Icon name="check" size={15} />
                  {t("hero.reassure.noCard")}
                </span>
                <span>
                  <Icon name="check" size={15} />
                  {t("hero.reassure.noInstall")}
                </span>
                <span>
                  <Icon name="check" size={15} />
                  {t("hero.reassure.cancel")}
                </span>
                <span>
                  <Icon name="check" size={15} />
                  {t("hero.reassure.languages", { count: locales.length })}
                </span>
              </div>
            </div>

            <div className="hero-art">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <span className="badge badge-p3">
                  <Icon name="activity" size={14} />
                  {t("hero.art.stage", { n: 3, name: tst("3.name") })}
                </span>
                <span className="small faint">{t("hero.art.week", { n: 7 })}</span>
              </div>
              <div className="grid g2" style={{ gap: 12 }}>
                <div className="face-frame">
                  <div className="small faint" style={{ marginBottom: 6 }}>
                    {t("hero.art.baseline", { date: fmtDateMD("2026-07-06", locale) })}
                  </div>
                  <FaceIllustration droop={0.72} side="left" size={132} label={t("hero.art.baselineAlt")} />
                </div>
                <div className="face-frame">
                  <div className="small faint" style={{ marginBottom: 6 }}>
                    {t("hero.art.latest", { date: fmtDateMD("2026-08-24", locale) })}
                  </div>
                  <FaceIllustration droop={0.34} side="left" size={132} label={t("hero.art.latestAlt")} />
                </div>
              </div>
              <div className="hero-art-cap">
                <span>
                  {t.rich("hero.art.score", {
                    from: score(41.2),
                    to: score(56.4),
                    b: (c) => <b className="strong num">{c}</b>,
                  })}
                </span>
                <span>
                  {t("hero.art.change", {
                    delta: format.number(15.2, { signDisplay: "always", minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                    weeks: 7,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="credbar">
        <div className="wrap credbar-in">
          <div className="cred">
            <Icon name="users" size={22} />
            <span>{t.rich("cred.people", { count: 14200, b: bNum })}</span>
          </div>
          <div className="cred">
            <Icon name="stethoscope" size={22} />
            <span>{t.rich("cred.clinician", { b })}</span>
          </div>
          <div className="cred">
            <Icon name="shield" size={22} />
            <span>{t.rich("cred.gdpr", { b })}</span>
          </div>
          <div className="cred">
            <Icon name="globe" size={22} />
            <span>{t.rich("cred.languages", { count: locales.length, b: bNum })}</span>
          </div>
          <div className="cred">
            <span>
              <Stars n={4.8} />
              <b className="num">{format.number(4.8)}</b>
              <span className="small muted">{t("cred.reviews", { count: 2140 })}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Problem / promise */}
      <section className="section">
        <div className="wrap-mid center">
          <p className="eyebrow">{t("problem.eyebrow")}</p>
          <h2 className="display h-sec" style={{ marginTop: 10 }}>
            {t("problem.title")}
          </h2>
          <p className="lead" style={{ marginTop: 16, maxWidth: "60ch", marginInline: "auto" }}>
            {t("problem.lead")}
          </p>
        </div>
        <div className="wrap grid g3" style={{ marginTop: 48 }}>
          <div className="card card-pad-lg feat">
            <div className="icon-tile">
              <Icon name="layers" size={20} />
            </div>
            <h3>{t("problem.rightWork.title")}</h3>
            <p>{t("problem.rightWork.body")}</p>
          </div>
          <div className="card card-pad-lg feat">
            <div className="icon-tile icon-tile-info">
              <Icon name="camera" size={20} />
            </div>
            <h3>{t("problem.proof.title")}</h3>
            <p>{t("problem.proof.body")}</p>
          </div>
          <div className="card card-pad-lg feat">
            <div className="icon-tile icon-tile-warm">
              <Icon name="stethoscope" size={20} />
            </div>
            <h3>{t("problem.person.title")}</h3>
            <p>{t("problem.person.body")}</p>
          </div>
        </div>
      </section>

      {/* Stages */}
      <section className="section section-tint">
        <div className="wrap">
          <div className="row-between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <p className="eyebrow">{t("stages.eyebrow")}</p>
              <h2 className="display h-sec" style={{ marginTop: 10 }}>
                {t("stages.title")}
              </h2>
            </div>
            <Link className="link-arrow" href="/guides">
              {t("stages.readGuide")}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="tl-pub" style={{ marginTop: 8 }}>
            <div className="tl-track">
              <i />
            </div>
            <div className="tl-marks">
              {stages.map((s) => (
                <div key={s.n} className="tl-mark" style={{ "--pc": `var(--${s.colour})` } as React.CSSProperties}>
                  <div className="tl-when">{t("stages.stage", { n: s.n, name: tst(`${s.n}.name`) })}</div>
                  <div className="tl-what">{tst(`${s.n}.short`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works, condensed */}
      <section className="section">
        <div className="wrap">
          <p className="eyebrow center">{t("gettingStarted.eyebrow")}</p>
          <h2 className="display h-sec center" style={{ marginTop: 10 }}>
            {t("gettingStarted.title")}
          </h2>
          <div className="steps-3" style={{ marginTop: 44 }}>
            <div className="step-c">
              <h3>{t("gettingStarted.assessment.title")}</h3>
              <p>{t("gettingStarted.assessment.body")}</p>
            </div>
            <div className="step-c">
              <h3>{t("gettingStarted.plan.title")}</h3>
              <p>{t("gettingStarted.plan.body")}</p>
            </div>
            <div className="step-c">
              <h3>{t("gettingStarted.daily.title")}</h3>
              <p>{t("gettingStarted.daily.body")}</p>
            </div>
          </div>
          <div className="center" style={{ marginTop: 44 }}>
            <StartFree />
          </div>
        </div>
      </section>

      {/* Ethics */}
      <section className="section section-warm">
        <div className="wrap-mid">
          <p className="eyebrow eyebrow-warm">{t("ethics.eyebrow")}</p>
          <h2 className="display h-sec" style={{ marginTop: 10 }}>
            {t("ethics.title")}
          </h2>
          <div className="grid g2" style={{ marginTop: 32 }}>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("ethics.predictions.title")}</h3>
              <p className="mt-4">{t("ethics.predictions.body")}</p>
            </div>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("ethics.guilt.title")}</h3>
              <p className="mt-4">{t("ethics.guilt.body")}</p>
            </div>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("ethics.badges.title")}</h3>
              <p className="mt-4">{t("ethics.badges.body")}</p>
            </div>
            <div className="card card-pad-lg">
              <h3 className="h-card">{t("ethics.comparing.title")}</h3>
              <p className="mt-4">{t("ethics.comparing.body")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="wrap">
          <p className="eyebrow">{t("testimonials.eyebrow")}</p>
          <h2 className="display h-sec" style={{ marginTop: 10 }}>
            {t("testimonials.title")}
          </h2>
          <div className="grid g3" style={{ marginTop: 40 }}>
            {testimonials.slice(0, 3).map((tm) => (
              <div key={tm.id} className="card card-pad-lg testi">
                <p className="testi-q">{t("testimonials.quote", { quote: ts(`${tm.id}.quote`) })}</p>
                <div className="testi-meta">
                  <div className="testi-who">{tm.who}</div>
                  <div className="testi-ctx">{ts(`${tm.id}.ctx`)}</div>
                  {/* Every testimonial in content.ts is a verified user (legacy `verified: true`). */}
                  <span className="verified">
                    <Icon name="check" size={12} />
                    {t("testimonials.verified")}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 36 }}>
            <Link className="link-arrow" href="/stories">
              {t("testimonials.readStories")}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section section-tint" id="pricing">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">{t("pricing.eyebrow")}</p>
            <h2 className="display h-sec" style={{ marginTop: 10 }}>
              {t("pricing.title")}
            </h2>
            <p className="lead" style={{ maxWidth: "54ch", margin: "16px auto 0" }}>
              {t("pricing.lead")}
            </p>
          </div>
          <div className="price-grid" style={{ marginTop: 52 }}>
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
          <p className="center small muted" style={{ marginTop: 32 }}>
            {t("pricing.after", {
              extension: money(extras.extension.price, locale),
              consult: money(extras.consult.price, locale),
              discount: extras.referralDiscount / 100,
            })}
          </p>
        </div>
      </section>

      {/* Knowledge teaser */}
      <section className="section">
        <div className="wrap">
          <div className="row-between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <p className="eyebrow">{t("guides.eyebrow")}</p>
              <h2 className="display h-sec" style={{ marginTop: 10 }}>
                {t("guides.title")}
              </h2>
            </div>
            <Link className="link-arrow" href="/guides">
              {t("guides.all")}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="kb-grid" style={{ marginTop: 36 }}>
            {articles.slice(0, 3).map((a) => (
              <Link key={a.slug} className="card card-pad-lg card-lift kb-card" href="/guides">
                <h3>{tg(`${a.slug}.title`)}</h3>
                <p>{tg(`${a.slug}.blurb`)}</p>
                <div className="kb-read">{t("guides.read", { minutes: a.read, date: fmtDateMD(a.updated, locale) })}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-sm" style={{ background: "var(--brand-tint)", borderBlock: "1px solid var(--brand-tint-2)" }}>
        <div className="wrap-mid center">
          <h2 className="display h-sec">{t("finalCta.title")}</h2>
          <p className="lead" style={{ marginTop: 14 }}>
            {t("finalCta.lead")}
          </p>
          <div style={{ marginTop: 28 }}>
            <StartFree />
          </div>
          <p className="small muted" style={{ marginTop: 20, maxWidth: "56ch", marginInline: "auto" }}>
            {tc("medicalDisclaimer")}
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
