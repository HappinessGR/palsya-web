import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { getDashboardData, getContentForStage, getTodaySessionRow } from "../data";
import { Icon } from "../../components/Icon";
import { SessionRunner } from "./SessionRunner";

export function generateMetadata() {
  return pageMetadata("dashboard.session.meta");
}

export default async function SessionPage() {
  const t = await getTranslations("dashboard");
  const tp = await getTranslations("programme.stages");
  const user = await currentUser();
  const data = user ? await getDashboardData(user.id) : null;
  const stageNum = data?.stageNum ?? 1;
  const stageN = Math.min(5, Math.max(1, stageNum));
  const [content, todaySession] = await Promise.all([
    getContentForStage(stageNum),
    data?.patientProfileId ? getTodaySessionRow(data.patientProfileId) : Promise.resolve(null),
  ]);

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <Link className="link-arrow small" href="/dashboard">
            <Icon name="arrow-left" size={14} />
            {t("backToDashboard")}
          </Link>
          <h2 style={{ marginTop: 10 }}>{t("session.title", { stage: stageNum, name: tp(`${stageN}.name`) })}</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            {t("session.intro")}
          </p>
        </div>
      </div>

      <SessionRunner
        taping={content.taping}
        exercises={content.exercises}
        routine={content.routine}
        initial={{
          tapingDone: todaySession?.tapingDone ?? false,
          routineDone: todaySession?.routineDone ?? false,
          completedExerciseIds: todaySession?.completedExerciseIds ?? [],
          observationNote: todaySession?.observationNote ?? "",
        }}
      />
    </div>
  );
}
