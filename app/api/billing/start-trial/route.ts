import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { getBillingStatus, startCardlessTrial } from "../../../../lib/billing/trial-subscription.service";
import { plans } from "../../../lib/content";

/**
 * Called from app/sign-up/starting-trial right after a Clerk sign-up
 * completes, with the plan id the patient picked on the pricing page.
 */
export async function POST(req: Request) {
  // Patients only: 401 when signed out, 403 for clinicians/admins (src/lib/permissions.ts).
  const authz = await authorizeApi("self:billing");
  if (!authz.ok) return authz.response;
  const userId = authz.actor.clerkUserId;

  // Idempotency: a reload of the starting-trial page must not create a
  // second Stripe customer/subscription for the same patient.
  const existing = await getBillingStatus(userId);
  if (existing.status !== "none") {
    return NextResponse.json({ ok: true, alreadyStarted: true });
  }

  const { planId } = (await req.json().catch(() => ({}))) as { planId?: string };
  const plan = plans.find((p) => p.id === planId) ?? plans[1];

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email;

  try {
    await startCardlessTrial({ clerkUserId: userId, email, name, priceId: plan.stripePriceId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("startCardlessTrial failed", err);
    return NextResponse.json({ error: "Could not start trial" }, { status: 500 });
  }
}
