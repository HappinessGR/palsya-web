import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../../src/lib/authz";
import { addNote, isUuid, listNotesForClinician } from "../../../../../../src/lib/clinician";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clinician/patients/[id]/notes — notes on an assigned patient, newest first. */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await authorizeApi("patients:assigned:notes");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const notes = await listNotesForClinician(auth.actor, id);
  if (!notes) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ notes });
}

/** POST /api/clinician/patients/[id]/notes — body { body: string } (1–5000 chars after trimming). */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authorizeApi("patients:assigned:notes");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const payload: unknown = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const result = await addNote(auth.actor, id, (payload as { body?: unknown }).body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 400 });
  }
  return NextResponse.json({ note: result.value }, { status: 201 });
}
