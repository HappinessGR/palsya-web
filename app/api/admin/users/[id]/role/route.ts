import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../../src/lib/authz";
import { isAppRole } from "../../../../../../src/lib/permissions";
import { changeRole } from "../../../../../../src/lib/user-admin";
import { ADMIN_ERROR_STATUS, isUuid, readJsonObject } from "../../../../../admin/shared";

/** PATCH /api/admin/users/:id/role  { role } — 409 last_admin, 404 not_found, 400 invalid_role. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await authorizeApi("users:role");
  if (!authz.ok) return authz.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (!isAppRole(body.role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });

  const res = await changeRole(authz.actor, id, body.role);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: ADMIN_ERROR_STATUS[res.error] ?? 400 });
  return NextResponse.json({ ok: true, role: body.role });
}
