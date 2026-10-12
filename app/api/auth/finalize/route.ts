import { NextResponse } from "next/server";
import { getActor } from "../../../../src/lib/authz";
import { ROLE_HOME } from "../../../../src/lib/permissions";
import { getBillingStatus } from "../../../../lib/billing/trial-subscription.service";

/**
 * Called by app/auth/continue straight after Clerk finishes a sign-in or
 * sign-up. Deliberately reads NOTHING from the request: the role comes from
 * users.role (getActor provisions a new account as "patient", or with the role
 * an admin's invitation granted). Anything a browser sends is ignored.
 */
export async function POST() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  if (actor.blocked) return NextResponse.json({ error: "account_suspended" }, { status: 403 });

  if (actor.role === "patient") {
    // A patient who has never had a trial or subscription starts the cardless trial first.
    const billing = await getBillingStatus(actor.clerkUserId);
    if (billing.status === "none") return NextResponse.json({ redirect: "/sign-up/starting-trial" });
  }
  return NextResponse.json({ redirect: ROLE_HOME[actor.role] });
}
