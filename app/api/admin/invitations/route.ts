import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { isLocale } from "../../../../i18n/config";
import { authorizeApi } from "../../../../src/lib/authz";
import { appUrl } from "../../../../src/lib/password-reset";
import { inviteUser, listPendingInvitations } from "../../../../src/lib/user-admin";
import { ADMIN_ERROR_STATUS, readJsonObject } from "../../../admin/shared";

/** GET /api/admin/invitations — pending staff invitations. */
export async function GET() {
  const authz = await authorizeApi("users:invite");
  if (!authz.ok) return authz.response;

  try {
    return NextResponse.json({ invitations: await listPendingInvitations() });
  } catch (err) {
    console.error("listPendingInvitations failed", err);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}

/** POST /api/admin/invitations  { email, role: "clinician" | "admin", locale }. */
export async function POST(req: Request) {
  const authz = await authorizeApi("users:invite");
  if (!authz.ok) return authz.response;

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const current = await getLocale();
  const locale = body.locale === undefined ? current : body.locale;
  if (!isLocale(locale)) return NextResponse.json({ error: "invalid_locale" }, { status: 400 });

  const res = await inviteUser(authz.actor, { email: body.email, role: body.role, locale }, appUrl(), current);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: ADMIN_ERROR_STATUS[res.error] ?? 400 });
  return NextResponse.json({ ok: true, invitationId: res.value.invitationId }, { status: 201 });
}
