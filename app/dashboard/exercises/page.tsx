import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { getShellData } from "../shell-data";
import { getAllExercises, type ExerciseItem } from "../taping/data";
import { ProgrammeFace } from "../taping/ProgrammeFace";

export function generateMetadata() {
  return pageMetadata("appProgramme.exercises.meta");
}

export default async function ExercisesPage() {
  const t = await getTranslations("appProgramme.exercises");
  const [{ stageNum }, all] = await Promise.all([getShellData(), getAllExercises()]);
  const mine = all.filter((x) => x.stages.includes(stageNum));
  const others = all.filter((x) => !x.stages.includes(stageNum));

  const exCard = (ex: ExerciseItem, active: boolean) => (
    <details className="acc" key={ex.slug} style={active ? undefined : { opacity: 0.78 }}>
      <summary>
        <span>
          {ex.name}{" "}
          <span className="small muted">
            · {ex.region} · {ex.reps} × {ex.hold}s
          </span>
        </span>
      </summary>
      <div className="acc-body">
        <div className="grid g2" style={{ alignItems: "start" }}>
          <div>
            <p className="small" style={{ color: "var(--brand-ink)" }}>
              <b>{t("why")}</b> {ex.why}
            </p>
            <ol className="ex-steps" style={{ marginTop: 14 }}>
              {ex.steps.map((s, i) => (
                // Seeded content library text; steps carry <b> emphasis like the prototype.
                <li key={i}>
                  <span dangerouslySetInnerHTML={{ __html: s }} />
                </li>
              ))}
            </ol>
            <div className="note note-warn" style={{ marginTop: 14 }}>
              <Icon name="alert" size={18} className="note-icon" />
              <div>
                <b>{t("watchFor")}</b> {ex.watch}
              </div>
            </div>
          </div>
          <div className="face-frame">
            <ProgrammeFace droop={0.38} size={170} midline />
            <dl className="kv small" style={{ marginTop: 14 }}>
              <dt>{t("repetitions")}</dt>
              <dd>{ex.reps}</dd>
              <dt>{t("hold")}</dt>
              <dd>{t("seconds", { n: ex.hold })}</dd>
              <dt>{t("restBetween")}</dt>
              <dd>{t("seconds", { n: ex.rest })}</dd>
              <dt>{t("stages")}</dt>
              <dd>{ex.stages.join(", ")}</dd>
            </dl>
          </div>
        </div>
      </div>
    </details>
  );

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("title")}
          </h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {t("sub", { n: mine.length, stage: stageNum })}
          </p>
        </div>
        <div className="row-wrap">
          <Link className="btn btn-sm" href="/dashboard/session">
            <Icon name="play" size={15} />
            {t("runToday")}
          </Link>
        </div>
      </div>

      <div className="note note-clinical">
        <Icon name="lightbulb" size={19} className="note-icon" />
        <div>
          <b>{t("thirdEffortTitle")}</b> {t("thirdEffortBody")}
        </div>
      </div>

      <h3 className="h-card" style={{ marginTop: "var(--s-7)" }}>
        {t("inProgrammeNow")}
      </h3>
      <div className="stack" style={{ marginTop: "var(--s-4)" }}>
        {mine.length ? mine.map((ex) => exCard(ex, true)) : <p className="muted">{t("noneNow")}</p>}
      </div>

      {others.length > 0 && (
        <>
          <h3 className="h-card" style={{ marginTop: "var(--s-8)" }}>
            {t("laterInProgramme")}
          </h3>
          <p className="small muted" style={{ marginTop: 4 }}>
            {t("notYet")}
          </p>
          <div className="stack" style={{ marginTop: "var(--s-4)" }}>
            {others.map((ex) => exCard(ex, false))}
          </div>
        </>
      )}
    </div>
  );
}
