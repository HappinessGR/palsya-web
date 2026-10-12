import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../components/Icon";
import {
  ROUTINE_MINUTES,
  TAPING_MINUTES,
  exerciseCountForStage,
  tapingKeyForStage,
  type Stage,
} from "../../lib/programme";

function Part({ icon, label, minutesLabel, done }: { icon: string; label: string; minutesLabel: string; done: boolean }) {
  return (
    <span className={`spart${done ? " done" : ""}`}>
      <Icon name={done ? "check" : icon} size={15} />
      <b>{label}</b> · {minutesLabel}
    </span>
  );
}

export interface TodaySessionState {
  tapingDone: boolean;
  exercisesDone: boolean;
  routineDone: boolean;
}

export async function SessionCard({ stage, todaySession }: { stage: Stage; todaySession: TodaySessionState | null }) {
  const t = await getTranslations("dashboard.sessionCard");
  const tp = await getTranslations("programme");
  const totalMinutes = TAPING_MINUTES + stage.minutes + ROUTINE_MINUTES;
  const parts = todaySession ?? { tapingDone: false, exercisesDone: false, routineDone: false };
  const allDone = parts.tapingDone && parts.exercisesDone && parts.routineDone;
  const anyDone = parts.tapingDone || parts.exercisesDone || parts.routineDone;

  return (
    <div className={`session-card${allDone ? " is-done" : ""}`}>
      <div className="session-top">
        <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className={`badge badge-p${stage.n}`}>
              <Icon name="activity" size={13} />
              {t("stageBadge", { stage: stage.n, name: tp(`stages.${stage.n}.name`) })}
            </span>
            <div className="session-title" style={{ marginTop: 10 }}>
              {t("title")}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {allDone ? t("allDone") : t("about", { minutes: totalMinutes })}
            </p>
          </div>
        </div>
        <div className="session-parts">
          <Part
            icon="tape"
            label={tp(`taping.${tapingKeyForStage(stage.n)}`)}
            minutesLabel={t("partMinutes", { minutes: TAPING_MINUTES })}
            done={parts.tapingDone}
          />
          <Part
            icon="activity"
            label={t("exercisesCount", { count: exerciseCountForStage(stage.n) })}
            minutesLabel={t("partMinutes", { minutes: stage.minutes })}
            done={parts.exercisesDone}
          />
          <Part
            icon="sun"
            label={t("dailyRoutine")}
            minutesLabel={t("partMinutes", { minutes: ROUTINE_MINUTES })}
            done={parts.routineDone}
          />
        </div>
      </div>
      <div className="session-bot">
        <Link className="btn btn-lg" href="/dashboard/session">
          {allDone ? t("review") : anyDone ? t("continue") : t("start")}
          <Icon name="arrow-right" size={18} />
        </Link>
        <span className="small muted">{t("order")}</span>
      </div>
    </div>
  );
}
