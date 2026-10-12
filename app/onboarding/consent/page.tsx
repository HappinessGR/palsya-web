import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOnboardingProgress, nextOnboardingPath } from "../data";
import { OnboardingShell } from "../components/OnboardingShell";
import { ConsentForm } from "../components/ConsentForm";
import { pageMetadata } from "../../../i18n/metadata";

export async function generateMetadata() {
  return pageMetadata("onboarding.consent.meta");
}

export default async function ConsentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  if (!progress.hasPreferences) redirect("/onboarding/preferences");
  if (progress.hasRequiredConsents) redirect(nextOnboardingPath(progress));

  return (
    <OnboardingShell step={4}>
      <ConsentForm />
    </OnboardingShell>
  );
}
