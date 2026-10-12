import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db";
import { subscriptions } from "../../../../src/db/schema/subscriptions";

// Lazy: the Stripe SDK throws immediately if the key is missing, and Next.js
// evaluates route modules during build-time page-data collection.
let _stripe: Stripe | undefined;
function stripeClient(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return _stripe;
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

function periodEndOf(subscription: Stripe.Subscription): Date {
  return new Date(subscription.items.data[0].current_period_end * 1000);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(body, signature as string, endpointSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return new NextResponse("Webhook signature verification failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({
            status: sub.status,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            currentPeriodEnd: periodEndOf(sub),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "checkout.session.completed": {
        // A patient just paid to (re)subscribe — a NEW Stripe subscription
        // object, so upsert rather than update-by-id.
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId =
          (session.metadata?.clerkUserId as string) ?? session.client_reference_id ?? null;

        if (clerkUserId && session.subscription) {
          const newSub = await stripeClient().subscriptions.retrieve(session.subscription as string);
          const values = {
            clerkUserId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: newSub.id,
            priceId: newSub.items.data[0]?.price?.id ?? "",
            status: newSub.status,
            trialEnd: null,
            currentPeriodEnd: periodEndOf(newSub),
            updatedAt: new Date(),
          };
          await db
            .insert(subscriptions)
            .values(values)
            .onConflictDoUpdate({ target: subscriptions.clerkUserId, set: values });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}`, err);
    // 500 so Stripe retries — don't mask a failed sync with a 200.
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
