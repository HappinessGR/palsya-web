import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../src/lib/authz";
import { getPatientForClinician, isUuid } from "../../../../../src/lib/clinician";
import { getPhaseHistory, getSessionHistory } from "../../../../dashboard/data";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clinician/patients/[id] — one assigned patient with session and stage history. */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await authorizeApi("patients:assigned:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  // Unknown and not-assigned answer the same 403, so existence isn't revealed.
  const patient = await getPatientForClinician(auth.actor, id);
  if (!patient) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [sessions, stageHistory] = await Promise.all([getSessionHistory(id), getPhaseHistory(id)]);
  return NextResponse.json({ patient, sessions, stageHistory });
}
