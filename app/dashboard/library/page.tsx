import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { articles } from "../../lib/content";
import { libraryPicks } from "../../lib/programme";
import { getShellData } from "../shell-data";

export function generateMetadata() {
  return pageMetadata("appSupport.library.meta");
}

// Ported from the legacy prototype's V['app/library'] (assets/js/views-app.js).
const MATERIAL = [
  { href: "/dashboard/taping", icon: "tape", key: "taping" },
  { href: "/dashboard/exercises", icon: "activity", key: "exercises" },
  { href: "/dashboard/routine", icon: "sun", key: "routine" },
] as const;

export default async function LibraryPage() {
  const t = await getTranslations("appSupport.library");
  const tShell = await getTranslations("dashboard.shell");
  const tg = await getTranslations("guides.articles");
  const format = await getFormatter();
  const { stageNum } = await getShellData();

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {tShell("nav.library")}
          </h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {t("pageSub")}
          </p>
        </div>
      </div>

      <h3 className="h-card">{t("forStage", { n: stageNum })}</h3>
      <div className="grid g3" style={{ marginTop: "var(--s-4)" }}>
        {libraryPicks(stageNum).map((a) => (
          <Link className="card card-pad-lg card-lift kb-card" href={`/dashboard/library/${a.slug}`} key={a.slug}>
            <span className="badge badge-brand" style={{ alignSelf: "flex-start" }}>
              {t("recommendedNow")}
            </span>
            <h3>{tg(`${a.slug}.title`)}</h3>
            <p>{tg(`${a.slug}.blurb`)}</p>
            <div className="kb-read">{t("minRead", { n: a.read })}</div>
          </Link>
        ))}
      </div>

      <h3 className="h-card" style={{ marginTop: "var(--s-8)" }}>
        {t("programmeMaterial")}
      </h3>
      <div className="grid g3" style={{ marginTop: "var(--s-4)" }}>
        {MATERIAL.map((m) => (
          <Link className="card card-pad-lg card-lift kb-card" href={m.href} key={m.href}>
            <div className="icon-tile">
              <Icon name={m.icon} size={20} />
            </div>
            <h3>{t(`${m.key}Title`)}</h3>
            <p>{t(`${m.key}Blurb`)}</p>
          </Link>
        ))}
      </div>

      <h3 className="h-card" style={{ marginTop: "var(--s-8)" }}>
        {t("allGuides")}
      </h3>
      <div className="grid g3" style={{ marginTop: "var(--s-4)" }}>
        {articles.map((a) => (
          <Link className="card card-pad-lg card-lift kb-card" href={`/dashboard/library/${a.slug}`} key={a.slug}>
            <h3>{tg(`${a.slug}.title`)}</h3>
            <p>{tg(`${a.slug}.blurb`)}</p>
            <div className="kb-read">
              {t("minReadReviewed", {
                n: a.read,
                date: format.dateTime(new Date(`${a.updated}T00:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" }),
              })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
