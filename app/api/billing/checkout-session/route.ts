import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { createResubscribeCheckoutSession } from "../../../../lib/billing/trial-subscription.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: Request) {
  // Patients only: 401 when signed out, 403 for clinicians/admins (src/lib/permissions.ts).
  const authz = await authorizeApi("self:billing");
  if (!authz.ok) return authz.response;
  const userId = authz.actor.clerkUserId;

  const { priceId } = (await req.json()) as { priceId?: string };
  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  try {
    const { url } = await createResubscribeCheckoutSession(
      userId,
      priceId,
      `${APP_URL}/dashboard?checkout=success`,
      `${APP_URL}/pricing?checkout=cancelled`,
    );
    return NextResponse.json({ url });
  } catch (err) {
    console.error("createResubscribeCheckoutSession failed", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
