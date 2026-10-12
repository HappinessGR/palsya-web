"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setTapingDone, setRoutineDone, toggleExerciseDone, saveSessionNote } from "./actions";
import { Icon } from "../../components/Icon";

interface ContentItem {
  id: string;
  slug: string;
  name: string;
  instructions: string;
  details: unknown;
}

interface TapingDetails {
  goal: string;
  tension: string;
  wear: string;
  strips: { where: string; from: string; to: string; note: string }[];
}
interface ExerciseDetails {
  region: string;
  muscle: string;
  why: string;
  reps: number;
  hold: number;
  rest: number;
  steps: string[];
  cues: string[];
  watch: string;
}
interface RoutineDetails {
  when: string;
  icon: string;
  body: string;
  items: string[];
}

function SectionHeader({ done, title, subtitle }: { done: boolean; title: string; subtitle: string }) {
  const t = useTranslations("dashboard.session");
  return (
    <div className="row-between" style={{ marginBottom: 14 }}>
      <div>
        <h3 className="h-card">{title}</h3>
        <p className="small muted" style={{ marginTop: 2 }}>
          {subtitle}
        </p>
      </div>
      {done && (
        <span className="badge badge-ok">
          <Icon name="check" size={13} />
          {t("doneToday")}
        </span>
      )}
    </div>
  );
}

export function SessionRunner({
  taping,
  exercises,
  routine,
  initial,
}: {
  taping: ContentItem[];
  exercises: ContentItem[];
  routine: ContentItem[];
  initial: { tapingDone: boolean; routineDone: boolean; completedExerciseIds: string[]; observationNote: string };
}) {
  const [tapingDone, setTapingDoneState] = useState(initial.tapingDone);
  const [routineDone, setRoutineDoneState] = useState(initial.routineDone);
  const [completed, setCompleted] = useState<string[]>(initial.completedExerciseIds);
  const [note, setNote] = useState(initial.observationNote);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("dashboard.session");
  const tl = useTranslations("library");
  /** Localised content-library text by slug, falling back to the DB's English for rows added later. */
  const lt = (key: string, fallback: string) => (tl.has(key) ? tl(key) : fallback);

  const allExerciseIds = exercises.map((e) => e.id);
  const exercisesDone = allExerciseIds.length > 0 && allExerciseIds.every((id) => completed.includes(id));

  function handleTapingToggle() {
    const next = !tapingDone;
    setTapingDoneState(next);
    startTransition(() => setTapingDone(next));
  }
  function handleRoutineToggle() {
    const next = !routineDone;
    setRoutineDoneState(next);
    startTransition(() => setRoutineDone(next));
  }
  function handleExerciseToggle(id: string) {
    const next = completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    startTransition(() => toggleExerciseDone(id, allExerciseIds));
  }
  function handleNoteBlur() {
    startTransition(() => saveSessionNote(note));
  }

  return (
    <div className="col" style={{ gap: "var(--s-6)", maxWidth: 820 }}>
      {/* ---------------- Taping ---------------- */}
      <div className={`card card-pad-lg ${tapingDone ? "session-card is-done" : ""}`}>
        <SectionHeader
          done={tapingDone}
          title={t("taping.title")}
          subtitle={taping[0] ? lt(`taping.${taping[0].slug}.name`, taping[0].name) : t("taping.none")}
        />
        {taping.map((tp) => {
          const d = tp.details as TapingDetails | null;
          // i18n-ignore -- message key, not text
          const k = `taping.${tp.slug}`;
          return (
            <div key={tp.id} style={{ marginBottom: 12 }}>
              {d && (
                <dl className="kv" style={{ marginBottom: 12 }}>
                  <dt>{t("taping.goal")}</dt>
                  <dd>{lt(`${k}.goal`, d.goal)}</dd>
                  <dt>{t("taping.tension")}</dt>
                  <dd>{lt(`${k}.tension`, d.tension)}</dd>
                  <dt>{t("taping.wear")}</dt>
                  <dd>{lt(`${k}.wear`, d.wear)}</dd>
                </dl>
              )}
              {d?.strips?.map((s, i) => (
                <div className="note" key={i} style={{ marginBottom: 8 }}>
                  <Icon name="tape" size={18} className="note-icon" />
                  <div>
                    <strong>{lt(`${k}.strips.s${i + 1}.where`, s.where)}</strong>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {t("taping.stripLine", {
                        from: lt(`${k}.strips.s${i + 1}.from`, s.from),
                        to: lt(`${k}.strips.s${i + 1}.to`, s.to),
                        note: lt(`${k}.strips.s${i + 1}.note`, s.note),
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <button type="button" className={tapingDone ? "btn btn-ghost" : "btn btn-lg"} onClick={handleTapingToggle} disabled={isPending}>
          {tapingDone ? t("markNotDone") : t("taping.markDone")}
        </button>
      </div>

      {/* ---------------- Exercises ---------------- */}
      <div className={`card card-pad-lg ${exercisesDone ? "session-card is-done" : ""}`}>
        <SectionHeader
          done={exercisesDone}
          title={t("exercises.title")}
          subtitle={t("exercises.progress", { done: completed.length, total: exercises.length })}
        />
        <div className="col" style={{ gap: 10 }}>
          {exercises.map((ex) => {
            const d = ex.details as ExerciseDetails | null;
            const isDone = completed.includes(ex.id);
            // i18n-ignore -- message key, not text
            const k = `exercises.${ex.slug}`;
            return (
              <details className="acc" key={ex.id} open={!isDone}>
                <summary>
                  <span className="row" style={{ gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleExerciseToggle(ex.id)}
                    />
                    {lt(`${k}.name`, ex.name)}
                  </span>
                  {d && (
                    <span className="small muted">
                      {t("exercises.dose", { reps: d.reps, hold: d.hold })}
                    </span>
                  )}
                </summary>
                <div className="acc-body">
                  {d && (
                    <>
                      <p className="small muted">{lt(`${k}.why`, d.why)}</p>
                      <ol style={{ marginTop: 10, paddingLeft: "1.2em" }}>
                        {d.steps.map((step, i) =>
                          tl.has(`${k}.steps.s${i + 1}`) ? ( // i18n-ignore
                            <li key={i} style={{ marginBottom: 6 }}>
                              {/* i18n-ignore */}
                              {tl.rich(`${k}.steps.s${i + 1}`, { b: (c) => <b>{c}</b> })}
                            </li>
                          ) : (
                            <li key={i} style={{ marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: step }} />
                          ),
                        )}
                      </ol>
                      <div className="note note-warn" style={{ marginTop: 12 }}>
                        <Icon name="info" size={18} className="note-icon" />
                        <div>{lt(`${k}.watch`, d.watch)}</div>
                      </div>
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* ---------------- Daily routine ---------------- */}
      <div className={`card card-pad-lg ${routineDone ? "session-card is-done" : ""}`}>
        <SectionHeader
          done={routineDone}
          title={t("routine.title")}
          subtitle={t("routine.count", { count: routine.length })}
        />
        <div className="col" style={{ gap: 8 }}>
          {routine.map((r) => {
            const d = r.details as RoutineDetails | null;
            // i18n-ignore -- message key, not text
            const k = `routine.${r.slug}`;
            return (
              <details className="acc" key={r.id}>
                <summary>
                  <span>{lt(`${k}.name`, r.name)}</span>
                  {d && <span className="small muted">{lt(`${k}.when`, d.when)}</span>}
                </summary>
                <div className="acc-body">
                  {d && (
                    <>
                      <p className="small muted">{lt(`${k}.body`, d.body)}</p>
                      <ul style={{ marginTop: 10, paddingLeft: "1.2em" }}>
                        {d.items.map((item, i) => (
                          <li key={i}>
                            {/* i18n-ignore */}
                            {lt(`${k}.items.i${i + 1}`, item)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        <button type="button" className={routineDone ? "btn btn-ghost" : "btn btn-lg"} style={{ marginTop: 16 }} onClick={handleRoutineToggle} disabled={isPending}>
          {routineDone ? t("markNotDone") : t("routine.markDone")}
        </button>
      </div>

      {/* ---------------- Note ---------------- */}
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("note.title")}</h3>
        <p className="small muted mt-4">{t("note.hint")}</p>
        <textarea
          className="textarea"
          style={{ marginTop: 12 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder={t("note.placeholder")}
        />
      </div>
    </div>
  );
}
