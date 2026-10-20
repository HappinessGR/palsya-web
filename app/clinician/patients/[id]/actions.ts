"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "../../../../src/lib/authz";
import { addNote, changeStage, isUuid } from "../../../../src/lib/clinician";

export type ClinicianActionState =
  | { status: "idle" }
  | { status: "ok"; stage?: number }
  | {
      status: "error";
      error: "not_signed_in" | "forbidden" | "invalid_note" | "invalid_stage" | "invalid_reason" | "failed";
    };

/**
 * The patient id arrives from the browser (bound to the form), so it is only a
 * candidate: the permission is checked first, then the lib functions check
 * that this patient is assigned to the signed-in clinician.
 */
export async function addNoteAction(
  patientProfileId: string,
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  const auth = await authorizeAction("patients:assigned:notes");
  if (!auth.ok) return { status: "error", error: auth.error };
  if (!isUuid(patientProfileId)) return { status: "error", error: "forbidden" };

  try {
    const result = await addNote(auth.actor, patientProfileId, formData.get("body"));
    if (!result.ok) return { status: "error", error: result.error };
  } catch {
    return { status: "error", error: "failed" };
  }
  revalidatePath(`/clinician/patients/${patientProfileId}`);
  return { status: "ok" };
}

export async function changeStageAction(
  patientProfileId: string,
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  const auth = await authorizeAction("patients:assigned:stage");
  if (!auth.ok) return { status: "error", error: auth.error };
  if (!isUuid(patientProfileId)) return { status: "error", error: "forbidden" };

  const reason = formData.get("reason");
  try {
    const result = await changeStage(
      auth.actor,
      patientProfileId,
      formData.get("stage"),
      typeof reason === "string" ? reason : undefined,
    );
    if (!result.ok) return { status: "error", error: result.error };
    revalidatePath(`/clinician/patients/${patientProfileId}`);
    revalidatePath("/clinician", "layout");
    return { status: "ok", stage: result.value.to };
  } catch {
    return { status: "error", error: "failed" };
  }
}
