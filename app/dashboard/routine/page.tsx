import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { getShellData } from "../shell-data";
import { getAllRoutine } from "../taping/data";

export function generateMetadata() {
  return pageMetadata("appProgramme.routine.meta");
}

export default async function RoutinePage() {
  const t = await getTranslations("appProgramme.routine");
  const [{ stageNum }, all] = await Promise.all([getShellData(), getAllRoutine()]);
  const items = all.filter((r) => r.stages.includes(stageNum));

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("title")}
          </h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {t("sub")}
          </p>
        </div>
      </div>

      <div className="note note-safety">
        <Icon name="alert" size={19} className="note-icon" />
        <div>
          <b>{t("eyeCareTitle")}</b> {t("eyeCareBody")}
        </div>
      </div>

      <div className="stack" style={{ marginTop: "var(--s-6)" }}>
        {items.map((r) => (
          <div className="card card-pad-lg" key={r.slug}>
            <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
              <div className={r.slug === "eye" ? "icon-tile" : "icon-tile icon-tile-info"}>
                <Icon name={r.icon} size={20} />
              </div>
              <div className="grow">
                <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                  <h3 className="h-card">{r.name}</h3>
                  {r.when && <span className="badge badge-outline">{r.when}</span>}
                </div>
                <p style={{ marginTop: 10 }}>{r.body}</p>
                <ul style={{ marginTop: 12, paddingLeft: "1.1em" }}>
                  {r.items.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: "var(--s-6)" }}>
        <Link className="link-arrow" href="/guides/daily-routine">
          {t("fullGuide")}
          <Icon name="arrow-right" size={16} />
        </Link>
      </p>
    </div>
  );
}
