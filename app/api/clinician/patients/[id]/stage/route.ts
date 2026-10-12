import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../../src/lib/authz";
import { changeStage, isUuid } from "../../../../../../src/lib/clinician";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/clinician/patients/[id]/stage — body { stage: 1–5, reason?: string }. */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authorizeApi("patients:assigned:stage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const payload: unknown = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { stage, reason } = payload as { stage?: unknown; reason?: unknown };

  const result = await changeStage(auth.actor, id, stage, reason);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 400 });
  }
  return NextResponse.json(result.value);
}
