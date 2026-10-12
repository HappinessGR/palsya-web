import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOnboardingProgress } from "../data";
import { OnboardingShell } from "../components/OnboardingShell";
import { AssessmentQuiz } from "../components/AssessmentQuiz";
import { pageMetadata } from "../../../i18n/metadata";

export async function generateMetadata() {
  return pageMetadata("onboarding.assessment.meta");
}

export default async function AssessmentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  // A finished assessment (one with a phase_assignments row already) has
  // moved past this step -- send the patient onward rather than letting
  // them re-answer and silently diverge from their committed phase.
  if (progress.phase) redirect("/onboarding/stage");

  return (
    <OnboardingShell step={1}>
      <AssessmentQuiz
        initialAnswers={(progress.assessment?.answers as Record<string, unknown>) ?? {}}
        initialId={progress.assessment?.id ?? null}
      />
    </OnboardingShell>
  );
}
