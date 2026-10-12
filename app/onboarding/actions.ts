"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import { db } from "../../src/db";
import { patientProfiles } from "../../src/db/schema/users";
import { assessmentResponses, safetyFlags, phaseAssignments, consentRecords } from "../../src/db/schema/onboarding";
import { patientPreferences } from "../../src/db/schema/preferences";
import { assignPhase, isBlocked, flagKey, reasonKey, reasonValues, type Answers } from "../../src/lib/assessment";
import assessmentEn from "../../locales/en/assessment.json";
import { getOrCreatePatientIdentity } from "./data";

const CONSENT_POLICY_VERSION = "2026-09-23";

/**
 * safety_flags.title/body keep the canonical English wording regardless of
 * the patient's UI language, so clinicians and the back office read one
 * consistent text. The patient sees the same messages in their own
 * language, rendered from the flag ids.
 */
const auditTranslator = createTranslator({ locale: "en", messages: { assessment: assessmentEn } });
function tAuditEn(key: string, values?: Record<string, string | number>): string {
  return (auditTranslator as unknown as (k: string, v?: Record<string, string | number>) => string)("assessment." + key, values);
}

/**
 * Called on every quiz section submit (autosave), matching the legacy
 * prototype's save-on-every-change behaviour. `existingId` is null for the
 * first section; the client then holds onto the returned id for every
 * subsequent section so the same row is updated in place rather than a
 * new one created per section.
 */
export async function saveAssessmentDraft(answers: Answers, existingId: string | null): Promise<{ id: string }> {
  const { patientProfileId } = await getOrCreatePatientIdentity();

  if (existingId) {
    const [row] = await db
      .update(assessmentResponses)
      .set({ answers, submittedAt: new Date() })
      // Scoped to the caller's own profile: existingId comes from the client,
      // so an id belonging to another patient must match no row.
      .where(and(eq(assessmentResponses.id, existingId), eq(assessmentResponses.patientProfileId, patientProfileId)))
      .returning({ id: assessmentResponses.id });
    if (row) return { id: row.id };
  }

  const [row] = await db.insert(assessmentResponses).values({ patientProfileId, answers }).returning({ id: assessmentResponses.id });
  return { id: row.id };
}

/**
 * Runs when the patient clicks through from the stage-result screen
 * ("Set up my sessions") or the blocked screen's "I have been assessed —
 * continue" override. Recomputes assignPhase from the *stored* answers
 * (never trusts a client-sent stage), writes the phase_assignments +
 * safety_flags audit rows, and updates patientProfiles.phase — mirroring
 * the legacy prototype's mountPhase() commit step.
 */
export async function proceedFromStage(assessmentResponseId: string, override: boolean): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();

  const assessment = await db.query.assessmentResponses.findFirst({ where: { id: assessmentResponseId, patientProfileId } });
  if (!assessment) throw new Error("Assessment response not found for this patient");

  const answers = assessment.answers as Answers;
  const result = assignPhase(answers);

  if (isBlocked(result.flags) && !override) {
    throw new Error("Cannot proceed past a blocking safety flag without an explicit override");
  }

  await db.insert(safetyFlags).values(
    result.flags.map((f) => ({
      assessmentResponseId,
      level: f.level,
      flagId: f.id,
      title: tAuditEn(flagKey(f) + ".title"),
      body: tAuditEn(flagKey(f) + ".body", f.values),
      overriddenAt: override && (f.level === "urgent" || f.level === "wait") ? new Date() : null,
    })),
  );

  await db.insert(phaseAssignments).values({
    patientProfileId,
    assessmentResponseId,
    stage: result.stage,
    source: "assessment",
    confidence: result.confidence,
    needsReview: result.needsReview,
    // Stored as { key, values, text }: the dashboard renders
    // assessment.reasons.<key> in the patient's language, and `text` keeps the
    // canonical English sentence for the audit trail (like safety_flags).
    reasons: result.reasons.map((r) => ({
      key: typeof r === "string" ? r : r.key,
      values: reasonValues(r) ?? {},
      text: tAuditEn(reasonKey(r), reasonValues(r)),
    })),
  });

  await db
    .update(patientProfiles)
    .set({
      phase: result.stage,
      onsetDate: typeof answers.onsetDate === "string" ? answers.onsetDate : undefined,
      updatedAt: new Date(),
    })
    .where(eq(patientProfiles.id, patientProfileId));

  redirect("/onboarding/preferences");
}

export interface PreferencesInput {
  remindersOn: boolean;
  reminderTime: string;
  secondReminderTime: string;
  cameraMirror: boolean;
  textSize: "normal" | "large" | "xl";
  weeklySummaryEmail: boolean;
  clinicianUpdatesEmail: boolean;
}

export async function savePreferences(input: PreferencesInput): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();

  const values = {
    patientProfileId,
    remindersOn: input.remindersOn,
    reminderTime: input.reminderTime || null,
    secondReminderTime: input.secondReminderTime || null,
    cameraMirror: input.cameraMirror,
    textSize: input.textSize,
    weeklySummaryEmail: input.weeklySummaryEmail,
    clinicianUpdatesEmail: input.clinicianUpdatesEmail,
    updatedAt: new Date(),
  };

  await db.insert(patientPreferences).values(values).onConflictDoUpdate({ target: patientPreferences.patientProfileId, set: values });

  redirect("/onboarding/consent");
}

export interface ConsentInput {
  dataProcessing: boolean;
  photoStorageAnalysis: boolean;
  photoKeep: boolean;
  clinicianShare: boolean;
  researchOptIn: boolean;
  marketing: boolean;
}

/**
 * dataProcessing and photoStorageAnalysis are the two required checkboxes
 * (matching the legacy consent screen); re-checked here server-side as
 * defense in depth even though the form already blocks submission
 * otherwise. termsOfService has no distinct checkbox in the legacy
 * design -- agreeing to this form is treated as agreeing to the Terms of
 * Service and Privacy Policy linked on the page, consistent with spec
 * 5.1's registration-screen consent, so it's recorded as granted
 * alongside dataProcessing rather than gated on its own input.
 */
export async function saveConsents(input: ConsentInput): Promise<void> {
  if (!input.dataProcessing || !input.photoStorageAnalysis) {
    throw new Error("The two required consents are needed for the programme to work.");
  }

  const { userId } = await getOrCreatePatientIdentity();

  const rows: { consentType: (typeof consentRecords.$inferInsert)["consentType"]; granted: boolean }[] = [
    { consentType: "data_processing", granted: true },
    { consentType: "terms_of_service", granted: true },
    { consentType: "photo_storage_analysis", granted: true },
    { consentType: "photo_keep", granted: input.photoKeep },
    { consentType: "clinician_share", granted: input.clinicianShare },
    { consentType: "research_opt_in", granted: input.researchOptIn },
    { consentType: "marketing", granted: input.marketing },
  ];

  await db.insert(consentRecords).values(
    rows.map((r) => ({
      userId,
      consentType: r.consentType,
      policyVersion: CONSENT_POLICY_VERSION,
      granted: r.granted,
    })),
  );

  redirect("/onboarding/ready");
}
