import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { getBillingStatus } from "../../../../lib/billing/trial-subscription.service";

export async function GET() {
  // Patients only: 401 when signed out, 403 for clinicians/admins (src/lib/permissions.ts).
  const authz = await authorizeApi("self:billing");
  if (!authz.ok) return authz.response;
  const userId = authz.actor.clerkUserId;

  const status = await getBillingStatus(userId);
  return NextResponse.json(status);
}
