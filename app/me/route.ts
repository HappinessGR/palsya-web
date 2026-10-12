import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "../../src/lib/authz";
import { ROLE_HOME } from "../../src/lib/permissions";

/**
 * "My dashboard": sends a signed-in user to their own area, decided by
 * users.role on the server — the header link never needs to know the role.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor();
  const target = !actor ? "/login" : actor.blocked ? "/login?error=account_suspended" : ROLE_HOME[actor.role];
  return NextResponse.redirect(new URL(target, req.url));
}
