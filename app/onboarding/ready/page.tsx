import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { getOnboardingProgress, trialChargeDate as trialChargeDateOf } from "../data";
import { stage as stageFor, tapingKeyForStage, exerciseCountForStage, TAPING_MINUTES, ROUTINE_MINUTES } from "../../lib/programme";
import { OnboardingShell } from "../components/OnboardingShell";
import { Icon } from "../../components/Icon";
import { pageMetadata } from "../../../i18n/metadata";

export async function generateMetadata() {
  return pageMetadata("onboarding.ready.meta");
}

export default async function ReadyPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  if (!progress.hasRequiredConsents) redirect("/onboarding/consent");

  const clerkUser = await currentUser();
  const t = await getTranslations("onboarding.ready");
  const tP = await getTranslations("programme");
  const format = await getFormatter();
  const stageNum = progress.phase?.stage ?? 1;
  const s = stageFor(stageNum);
  const totalMinutes = s.minutes + TAPING_MINUTES + ROUTINE_MINUTES;
  const trialChargeDate = format.dateTime(trialChargeDateOf(), { day: "numeric", month: "long", year: "numeric" });

  return (
    <OnboardingShell step={5} wide>
      <div className="wrap-mid" style={{ padding: 0 }}>
        <div className="center">
          <div className="icon-tile icon-tile-ok" style={{ margin: "0 auto 18px" }}>
            <Icon name="check" size={22} />
          </div>
          <h1 className="display" style={{ fontSize: "var(--t-4xl)" }}>
            {clerkUser?.firstName ? t("title", { name: clerkUser.firstName }) : t("titleNoName")}
          </h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: "56ch", marginInline: "auto" }}>
            {t("summary", { stage: stageNum, name: tP(`stages.${s.n}.name`), minutes: totalMinutes, sessions: t("sessionsFallback") })}
          </p>
        </div>

        <div className="grid g3" style={{ marginTop: 36 }}>
          <div className="card card-pad-lg">
            <div className="icon-tile icon-tile-warm" style={{ marginBottom: 14 }}>
              <Icon name="tape" size={20} />
            </div>
            <h3 className="h-card">{t("tapingTitle")}</h3>
            <p className="mt-4">{t("tapingSummary", { name: tP(`taping.${tapingKeyForStage(stageNum)}`), minutes: TAPING_MINUTES })}</p>
            <p className="small muted mt-4">{t("tapingHint")}</p>
          </div>
          <div className="card card-pad-lg">
            <div className="icon-tile" style={{ marginBottom: 14 }}>
              <Icon name="activity" size={20} />
            </div>
            <h3 className="h-card">{t("exercisesTitle")}</h3>
            <p className="mt-4">{t("exercisesSummary", { count: exerciseCountForStage(stageNum), minutes: s.minutes })}</p>
            <p className="small muted mt-4">{t("exercisesHint")}</p>
          </div>
          <div className="card card-pad-lg">
            <div className="icon-tile icon-tile-info" style={{ marginBottom: 14 }}>
              <Icon name="sun" size={20} />
            </div>
            <h3 className="h-card">{t("routineTitle")}</h3>
            <p className="mt-4">{t("routineSummary", { count: 5, minutes: ROUTINE_MINUTES })}</p>
            <p className="small muted mt-4">{t("routineHint")}</p>
          </div>
        </div>

        <div className="card card-pad-lg card-brand" style={{ marginTop: 22 }}>
          <div className="row-between" style={{ flexWrap: "wrap", gap: 16 }}>
            <div>
              <h3 className="h-card">{t("trialTitle")}</h3>
              <p className="mt-4">
                {t("trialSummary", { price: t("priceFallback"), date: trialChargeDate })}
              </p>
            </div>
            <Link className="btn btn-quiet btn-sm" href="/pricing">
              {t("changePlan")}
            </Link>
          </div>
        </div>

        <div className="center" style={{ marginTop: 32 }}>
          <Link className="btn btn-lg" href="/dashboard">
            {t("goToSession")}
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
