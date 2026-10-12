import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { createCardSetupIntent } from "../../../../lib/billing/trial-subscription.service";

export async function POST() {
  // Patients only: 401 when signed out, 403 for clinicians/admins (src/lib/permissions.ts).
  const authz = await authorizeApi("self:billing");
  if (!authz.ok) return authz.response;
  const userId = authz.actor.clerkUserId;

  try {
    const { clientSecret } = await createCardSetupIntent(userId);
    return NextResponse.json({ clientSecret });
  } catch (err) {
    console.error("createCardSetupIntent failed", err);
    return NextResponse.json({ error: "Could not start card setup" }, { status: 500 });
  }
}
