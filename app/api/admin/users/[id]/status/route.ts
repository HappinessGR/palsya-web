import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../../src/lib/authz";
import { setStatus } from "../../../../../../src/lib/user-admin";
import { ADMIN_ERROR_STATUS, isUuid, readJsonObject } from "../../../../../admin/shared";

/** PATCH /api/admin/users/:id/status  { status: "active" | "suspended" }. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await authorizeApi("users:status");
  if (!authz.ok) return authz.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (body.status !== "active" && body.status !== "suspended") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const res = await setStatus(authz.actor, id, body.status);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: ADMIN_ERROR_STATUS[res.error] ?? 400 });
  return NextResponse.json({ ok: true, status: body.status });
}
