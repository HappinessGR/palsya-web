import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../../src/db";
import { getOnboardingProgress, nextOnboardingPath } from "../data";
import { OnboardingShell } from "../components/OnboardingShell";
import { PreferencesForm } from "../components/PreferencesForm";
import { pageMetadata } from "../../../i18n/metadata";

export async function generateMetadata() {
  return pageMetadata("onboarding.prefs.meta");
}

export default async function PreferencesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  if (!progress.phase) redirect("/onboarding/stage");
  if (progress.hasPreferences) redirect(nextOnboardingPath(progress));

  const existing = await db.query.patientPreferences.findFirst({ where: { patientProfileId: progress.patientProfileId } });

  return (
    <OnboardingShell step={3}>
      <PreferencesForm
        initial={{
          remindersOn: existing?.remindersOn ?? true,
          reminderTime: existing?.reminderTime ?? "08:30",
          secondReminderTime: existing?.secondReminderTime ?? "",
          cameraMirror: existing?.cameraMirror ?? true,
          textSize: existing?.textSize ?? "normal",
          weeklySummaryEmail: existing?.weeklySummaryEmail ?? true,
          clinicianUpdatesEmail: existing?.clinicianUpdatesEmail ?? true,
        }}
      />
    </OnboardingShell>
  );
}
