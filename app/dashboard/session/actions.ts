"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../../src/db";
import { dailySessions } from "../../../src/db/schema/daily-sessions";
import { getOrCreatePatientIdentity } from "../../../src/lib/patient-identity";
import { today } from "../../../src/lib/assessment";

/** Creates today's daily_sessions row if it doesn't exist yet (spec 6.1's ensureToday()). */
async function ensureTodayRow(patientProfileId: string) {
  const existing = await db.query.dailySessions.findFirst({ where: { patientProfileId, date: today() } });
  if (existing) return existing;

  const [inserted] = await db
    .insert(dailySessions)
    .values({ patientProfileId, date: today() })
    .onConflictDoNothing({ target: [dailySessions.patientProfileId, dailySessions.date] })
    .returning();

  return inserted ?? (await db.query.dailySessions.findFirst({ where: { patientProfileId, date: today() } }))!;
}

export async function setTapingDone(done: boolean): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();
  await ensureTodayRow(patientProfileId);
  await db
    .update(dailySessions)
    .set({ tapingDone: done, updatedAt: new Date() })
    .where(and(eq(dailySessions.patientProfileId, patientProfileId), eq(dailySessions.date, today())));
  revalidatePath("/dashboard/session");
  revalidatePath("/dashboard");
}

export async function setRoutineDone(done: boolean): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();
  await ensureTodayRow(patientProfileId);
  await db
    .update(dailySessions)
    .set({ routineDone: done, updatedAt: new Date() })
    .where(and(eq(dailySessions.patientProfileId, patientProfileId), eq(dailySessions.date, today())));
  revalidatePath("/dashboard/session");
  revalidatePath("/dashboard");
}

/**
 * Toggles one exercise in/out of completedExerciseIds and derives
 * exercisesDone from whether every exercise assigned to the current stage
 * is now in that list -- `allStageExerciseIds` is passed in by the client
 * (it already has the stage's exercise list rendered) rather than
 * re-deriving the patient's stage here.
 */
export async function toggleExerciseDone(exerciseId: string, allStageExerciseIds: string[]): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();
  const row = await ensureTodayRow(patientProfileId);

  const current = Array.isArray(row.completedExerciseIds) ? (row.completedExerciseIds as string[]) : [];
  const next = current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId];
  const exercisesDone = allStageExerciseIds.length > 0 && allStageExerciseIds.every((id) => next.includes(id));

  await db
    .update(dailySessions)
    .set({ completedExerciseIds: next, exercisesDone, updatedAt: new Date() })
    .where(and(eq(dailySessions.patientProfileId, patientProfileId), eq(dailySessions.date, today())));
  revalidatePath("/dashboard/session");
  revalidatePath("/dashboard");
}

export async function saveSessionNote(note: string): Promise<void> {
  const { patientProfileId } = await getOrCreatePatientIdentity();
  await ensureTodayRow(patientProfileId);
  await db
    .update(dailySessions)
    .set({ observationNote: note, updatedAt: new Date() })
    .where(and(eq(dailySessions.patientProfileId, patientProfileId), eq(dailySessions.date, today())));
  revalidatePath("/dashboard/session");
}
