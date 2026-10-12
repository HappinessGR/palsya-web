import { db } from "../../src/db";
import { getOrCreatePatientIdentity } from "../../src/lib/patient-identity";

export { getOrCreatePatientIdentity };
export type { PatientIdentity } from "../../src/lib/patient-identity";

export interface OnboardingProgress {
  patientProfileId: string;
  userId: string;
  assessment: { id: string; answers: Record<string, unknown> } | null;
  phase: { stage: number; needsReview: boolean } | null;
  hasPreferences: boolean;
  hasRequiredConsents: boolean;
}

const REQUIRED_CONSENT_TYPES = ["data_processing", "terms_of_service"] as const;

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const { userId, patientProfileId } = await getOrCreatePatientIdentity();

  const [latestAssessment, latestPhase, preferences, consentRows] = await Promise.all([
    db.query.assessmentResponses.findFirst({
      where: { patientProfileId },
      orderBy: { submittedAt: "desc" },
    }),
    db.query.phaseAssignments.findFirst({
      where: { patientProfileId },
      orderBy: { assignedAt: "desc" },
    }),
    db.query.patientPreferences.findFirst({ where: { patientProfileId } }),
    db.query.consentRecords.findMany({
      where: { userId, consentType: { in: [...REQUIRED_CONSENT_TYPES] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const grantedByType = new Map<string, boolean>();
  for (const row of consentRows) {
    if (!grantedByType.has(row.consentType)) grantedByType.set(row.consentType, row.granted);
  }
  const hasRequiredConsents = REQUIRED_CONSENT_TYPES.every((t) => grantedByType.get(t) === true);

  return {
    patientProfileId,
    userId,
    assessment: latestAssessment ? { id: latestAssessment.id, answers: latestAssessment.answers as Record<string, unknown> } : null,
    phase: latestPhase ? { stage: latestPhase.stage, needsReview: latestPhase.needsReview } : null,
    hasPreferences: !!preferences,
    hasRequiredConsents,
  };
}

/** Where a patient should land given how far they've gotten. */
export function nextOnboardingPath(progress: OnboardingProgress): string {
  if (!progress.assessment) return "/onboarding";
  if (!progress.phase) return "/onboarding/stage";
  if (!progress.hasPreferences) return "/onboarding/preferences";
  if (!progress.hasRequiredConsents) return "/onboarding/consent";
  return "/dashboard";
}

export { REQUIRED_CONSENT_TYPES };

/**
 * A plain (non-component) helper so `Date.now()` isn't called directly
 * inside a page component's body -- the React Compiler purity lint rule
 * flags that as an impure render call even in a Server Component that
 * only ever runs once per request.
 */
export function trialChargeDate(): Date {
  return new Date(Date.now() + 7 * 86_400_000);
}
