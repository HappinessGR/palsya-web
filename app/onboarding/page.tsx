import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOnboardingProgress, nextOnboardingPath } from "./data";
import { OnboardingShell } from "./components/OnboardingShell";
import { Icon } from "../components/Icon";
import { pageMetadata } from "../../i18n/metadata";

export async function generateMetadata() {
  return pageMetadata("onboarding.meta");
}

export default async function OnboardingWelcomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  // Only the welcome screen (step 0) is reachable without an assessment
  // started -- every other step redirects here via nextOnboardingPath, so
  // resuming a patient who already has one in progress skips straight
  // past this screen rather than re-showing it.
  if (progress.assessment) {
    redirect(nextOnboardingPath(progress));
  }

  const t = await getTranslations("onboarding.welcome");

  return (
    <OnboardingShell step={0}>
      <div className="wrap-read" style={{ padding: 0 }}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
          {t("heading")}
        </h1>
        <p className="lead" style={{ marginTop: 18 }}>
          {t("lead")}
        </p>

        <div className="grid g2" style={{ marginTop: 32 }}>
          <div className="card card-pad-lg">
            <div className="icon-tile" style={{ marginBottom: 14 }}>
              <Icon name="camera" size={20} />
            </div>
            <h3 className="h-card">{t("mirrorTitle")}</h3>
            <p className="mt-4">{t("mirrorBody")}</p>
          </div>
          <div className="card card-pad-lg">
            <div className="icon-tile" style={{ marginBottom: 14 }}>
              <Icon name="shield" size={20} />
            </div>
            <h3 className="h-card">{t("safetyTitle")}</h3>
            <p className="mt-4">{t("safetyBody")}</p>
          </div>
        </div>

        <div className="note note-clinical" style={{ marginTop: 26 }}>
          <Icon name="stethoscope" size={20} className="note-icon" />
          <div dangerouslySetInnerHTML={{ __html: t.raw("clinicalNote") }} />
        </div>

        <div className="row-wrap" style={{ marginTop: 32 }}>
          <Link className="btn btn-lg" href="/onboarding/assessment">
            {t("start")}
            <Icon name="arrow-right" size={18} />
          </Link>
          <Link className="btn btn-lg btn-quiet" href="/guides">
            {t("learnMore")}
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
