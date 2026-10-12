import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../components/Icon";
import { stages, type Stage } from "../../lib/programme";

const PATTERN_DAYS = 21;

export async function PhaseBandCard({
  stage,
  daysInStage,
  recentPattern,
}: {
  stage: Stage;
  daysInStage: number;
  recentPattern: ("full" | "part" | "none")[];
}) {
  const t = await getTranslations("dashboard.phaseBand");
  const tp = await getTranslations("programme.stages");

  return (
    <div className="card card-pad-lg">
      <div className="card-hd">
        <h3>{t("title")}</h3>
        <Link className="link-arrow small" href="/dashboard/progress">
          {t("fullProgress")}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      <div className="phase-band">
        {stages.map((s) => (
          <div
            className={`pb-seg ${s.n < stage.n ? "past" : s.n === stage.n ? "now" : ""}`}
            style={{ "--pc": `var(--${s.colour})` } as CSSProperties}
            key={s.n}
          >
            <div className="pb-n">{s.n}</div>
            <div className="pb-l">{tp(`${s.n}.name`)}</div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        {t("summary", { short: tp(`${stage.n}.short`), days: daysInStage })}
      </p>

      <div className="divider" />
      <div className="small strong" style={{ marginBottom: 8 }}>
        {t("patternTitle")}
      </div>
      <div className="pat" role="img" aria-label={t("patternLabel", { days: PATTERN_DAYS })}>
        {recentPattern.map((state, i) => (
          <i className={`pat-d pat-${state}`} title={t(`state.${state}`)} key={i} />
        ))}
      </div>
      <p className="small faint" style={{ marginTop: 10 }}>
        {t("legend")}
      </p>
    </div>
  );
}
