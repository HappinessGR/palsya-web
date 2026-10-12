import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { attachCardAsDefault } from "../../../../lib/billing/trial-subscription.service";

export async function POST(req: Request) {
  // Patients only: 401 when signed out, 403 for clinicians/admins (src/lib/permissions.ts).
  const authz = await authorizeApi("self:billing");
  if (!authz.ok) return authz.response;
  const userId = authz.actor.clerkUserId;

  const { paymentMethodId } = (await req.json()) as { paymentMethodId?: string };
  if (!paymentMethodId) {
    return NextResponse.json({ error: "paymentMethodId is required" }, { status: 400 });
  }

  try {
    await attachCardAsDefault(userId, paymentMethodId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("attachCardAsDefault failed", err);
    return NextResponse.json({ error: "Could not link payment method" }, { status: 500 });
  }
}
