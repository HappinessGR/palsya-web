import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { getShellData } from "../shell-data";
import { getAllTaping } from "./data";
import { ProgrammeFace } from "./ProgrammeFace";

export function generateMetadata() {
  return pageMetadata("appProgramme.taping.meta");
}

/** Strip paths per technique, from legacy V['app/taping'] (tp-rest / tp-assist / tp-guide). */
const TAPE_PATHS: Record<string, [number, number][][]> = {
  rest: [
    [[14, 168], [30, 150], [42, 126]],
    [[26, 186], [40, 172], [52, 152]],
  ],
  assist: [
    [[26, 186], [42, 166], [56, 132]],
    [[38, 88], [40, 74], [38, 58]],
  ],
  guide: [
    [[42, 112], [54, 118], [62, 126]],
    [[34, 140], [40, 158], [42, 174]],
  ],
};

const SAFETY_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

export default async function TapingPage() {
  const t = await getTranslations("appProgramme.taping");
  const [{ stageNum }, techniques] = await Promise.all([getShellData(), getAllTaping()]);

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("pageTitle")}
          </h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {t("pageSub")}
          </p>
        </div>
        <div className="row-wrap">
          <Link className="btn btn-sm" href="/dashboard/session">
            <Icon name="play" size={15} />
            {t("todaysSession")}
          </Link>
        </div>
      </div>

      <div className="note note-warm">
        <Icon name="alert" size={19} className="note-icon" />
        <div>
          <b>{t("patchTestTitle")}</b> {t("patchTestBody")}
        </div>
      </div>

      <div className="stack-lg" style={{ marginTop: "var(--s-6)" }}>
        {techniques.map((tp) => {
          const mine = tp.stages.includes(stageNum);
          return (
            <div
              key={tp.slug}
              className={mine ? "card card-pad-lg" : "card card-pad-lg card-flat"}
              style={mine ? { borderColor: "var(--brand-tint-2)" } : { opacity: 0.82 }}
            >
              <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 className="h-card">{tp.name}</h3>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {t("stagesWear", { stages: tp.stages.join(", "), wear: tp.wear.toLowerCase() })}
                  </div>
                </div>
                {mine && (
                  <span className="badge badge-brand">
                    <Icon name="check" size={13} />
                    {t("currentTechnique")}
                  </span>
                )}
              </div>
              <p style={{ marginTop: 14 }}>{tp.goal}</p>
              <div className="note note-warn" style={{ marginTop: 14 }}>
                <Icon name="info" size={18} className="note-icon" />
                <div>
                  <b>{t("tension")}</b> {tp.tension}
                </div>
              </div>
              <div className="grid g2" style={{ marginTop: 18, alignItems: "center" }}>
                <div className="face-frame">
                  <ProgrammeFace droop={0.45} size={180} tape={TAPE_PATHS[tp.slug]} />
                </div>
                <div className="stack-sm">
                  {tp.strips.map((s, i) => (
                    <div className="card card-pad-sm card-flat" key={i}>
                      <div className="strong small">
                        {i + 1}. {s.where}
                      </div>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {t("stripFromTo", { from: s.from.toLowerCase(), to: s.to.toLowerCase() })}
                      </div>
                      <div className="small" style={{ marginTop: 6, color: "var(--warm-ink)" }}>
                        {s.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
        <h3 className="h-card">{t("safetyEveryTime")}</h3>
        <ul style={{ marginTop: 12, paddingLeft: "1.1em" }}>
          {SAFETY_KEYS.map((k) => (
            <li key={k}>{t(`safety.${k}`)}</li>
          ))}
        </ul>
        <Link className="link-arrow" href="/guides/facial-taping-guide" style={{ marginTop: 14 }}>
          {t("fullGuide")}
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </div>
  );
}
