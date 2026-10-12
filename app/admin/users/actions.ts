"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorizeAction } from "../../../src/lib/authz";
import { isAppRole } from "../../../src/lib/permissions";
import { assignClinician, changeRole, setStatus } from "../../../src/lib/user-admin";
import { isUuid } from "../shared";

/**
 * Server actions behind the forms on /admin/users. Each one checks the
 * permission first (role read from the DB by authorizeAction), validates the
 * form fields, then calls src/lib/user-admin.ts — which enforces the data
 * rules (last admin etc.) and writes the audit log. The outcome travels back
 * as ?result= / ?error= so the page can show it without client state.
 */
function back(form: FormData, outcome: { result: string } | { error: string }): never {
  const qs = new URLSearchParams();
  const role = form.get("filter");
  if (typeof role === "string" && isAppRole(role)) qs.set("role", role);
  if ("result" in outcome) qs.set("result", outcome.result);
  else qs.set("error", outcome.error);
  redirect(`/admin/users?${qs.toString()}`);
}

export async function changeRoleAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("users:role");
  if (!auth.ok) back(form, { error: auth.error });

  const userId = form.get("userId");
  const role = form.get("role");
  if (!isUuid(userId)) back(form, { error: "invalid_input" });
  if (!isAppRole(role)) back(form, { error: "invalid_role" });

  const res = await changeRole(auth.actor, userId, role);
  revalidatePath("/admin", "layout");
  back(form, res.ok ? { result: "role_changed" } : { error: res.error });
}

export async function setStatusAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("users:status");
  if (!auth.ok) back(form, { error: auth.error });

  const userId = form.get("userId");
  const status = form.get("status");
  if (!isUuid(userId) || (status !== "active" && status !== "suspended")) back(form, { error: "invalid_input" });

  const res = await setStatus(auth.actor, userId, status);
  revalidatePath("/admin", "layout");
  back(form, res.ok ? { result: "status_changed" } : { error: res.error });
}

export async function assignClinicianAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("assignments:write");
  if (!auth.ok) back(form, { error: auth.error });

  const patientProfileId = form.get("patientProfileId");
  const clinician = form.get("clinicianUserId");
  if (!isUuid(patientProfileId)) back(form, { error: "invalid_input" });
  const clinicianUserId = clinician === "" || clinician === null ? null : clinician;
  if (clinicianUserId !== null && !isUuid(clinicianUserId)) back(form, { error: "invalid_input" });

  const res = await assignClinician(auth.actor, patientProfileId, clinicianUserId);
  revalidatePath("/admin", "layout");
  back(form, res.ok ? { result: "assigned" } : { error: res.error });
}
