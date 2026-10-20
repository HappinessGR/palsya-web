"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../src/db";
import { patientPreferences } from "../../../src/db/schema/preferences";
import { getOrCreatePatientIdentity } from "../../../src/lib/patient-identity";

export type SaveState = { status: "idle" | "saved" | "error" };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TEXT_SIZES = ["normal", "large", "xl"] as const;

function time(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && TIME.test(value) ? value : null;
}

/**
 * Saves the Reminders and language tab to patient_preferences (upsert by
 * patient_profile_id). getOrCreatePatientIdentity() checks the caller is a
 * signed-in, unblocked patient — the same guard as the session actions.
 */
export async function savePreferences(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const { patientProfileId } = await getOrCreatePatientIdentity();
    const size = formData.get("textSize");
    const values = {
      patientProfileId,
      remindersOn: formData.get("remindersOn") === "on",
      reminderTime: time(formData.get("reminderTime")),
      secondReminderTime: time(formData.get("secondReminderTime")),
      cameraMirror: formData.get("cameraMirror") === "on",
      textSize: TEXT_SIZES.find((s) => s === size) ?? "normal",
      weeklySummaryEmail: formData.get("weeklySummaryEmail") === "on",
      clinicianUpdatesEmail: formData.get("clinicianUpdatesEmail") === "on",
      updatedAt: new Date(),
    };
    await db
      .insert(patientPreferences)
      .values(values)
      .onConflictDoUpdate({ target: patientPreferences.patientProfileId, set: values });
  } catch (error) {
    console.error("[settings] savePreferences failed", error);
    return { status: "error" };
  }
  revalidatePath("/dashboard/settings");
  return { status: "saved" };
}
