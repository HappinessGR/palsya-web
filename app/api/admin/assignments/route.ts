import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { assignClinician } from "../../../../src/lib/user-admin";
import { ADMIN_ERROR_STATUS, isUuid, readJsonObject } from "../../../admin/shared";

/** PUT /api/admin/assignments  { patientProfileId, clinicianUserId | null }. */
export async function PUT(req: Request) {
  const authz = await authorizeApi("assignments:write");
  if (!authz.ok) return authz.response;

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { patientProfileId, clinicianUserId } = body;
  if (!isUuid(patientProfileId)) return NextResponse.json({ error: "invalid_patient_profile_id" }, { status: 400 });
  if (clinicianUserId !== null && !isUuid(clinicianUserId)) {
    return NextResponse.json({ error: "invalid_clinician_user_id" }, { status: 400 });
  }

  const res = await assignClinician(authz.actor, patientProfileId, clinicianUserId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: ADMIN_ERROR_STATUS[res.error] ?? 400 });
  return NextResponse.json({ ok: true, patientProfileId, clinicianUserId });
}
