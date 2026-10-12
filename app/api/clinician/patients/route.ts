import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { listAssignedPatients } from "../../../../src/lib/clinician";

/** GET /api/clinician/patients — the signed-in clinician's assigned patients. */
export async function GET() {
  const auth = await authorizeApi("patients:assigned:read");
  if (!auth.ok) return auth.response;
  const patients = await listAssignedPatients(auth.actor);
  return NextResponse.json({ patients });
}
