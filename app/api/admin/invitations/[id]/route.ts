import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../../src/lib/authz";
import { revokeInvitation } from "../../../../../src/lib/user-admin";
import { ADMIN_ERROR_STATUS, isInvitationId } from "../../../../admin/shared";

/** DELETE /api/admin/invitations/:id — revokes a pending invitation. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await authorizeApi("users:invite");
  if (!authz.ok) return authz.response;

  const { id } = await ctx.params;
  if (!isInvitationId(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const res = await revokeInvitation(authz.actor, id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: ADMIN_ERROR_STATUS[res.error] ?? 400 });
  return NextResponse.json({ ok: true });
}
