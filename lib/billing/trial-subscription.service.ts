import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../../src/db';
import { subscriptions } from '../../src/db/schema/subscriptions';
import { plans } from '../../app/lib/content';

// Lazy: the Stripe SDK throws immediately if the key is missing, and this
// module is imported by pages (e.g. /pricing) that Next.js evaluates during
// build/page-data collection, before STRIPE_SECRET_KEY is necessarily set.
let _stripe: Stripe | undefined;
function stripeClient(): Stripe {
  if (!_stripe) {
    // Pinned to the version this package (stripe@22) defaults to — bump
    // deliberately alongside a `stripe` package upgrade, not silently.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-08-26.dahlia',
    });
  }
  return _stripe;
}

const TRIAL_DAYS = 7;

function periodEndOf(subscription: Stripe.Subscription): Date {
  return new Date(subscription.items.data[0].current_period_end * 1000);
}

export interface StartTrialInput {
  clerkUserId: string;
  email: string;
  name: string;
  priceId: string;
}

/**
 * Starts the cardless trial. Called once, right after a patient's Clerk
 * sign-up completes (app/sign-up/starting-trial), with the plan they picked
 * on the pricing page. Callers are responsible for not calling this twice
 * for the same clerkUserId (see getBillingStatus).
 */
export async function startCardlessTrial(input: StartTrialInput) {
  const { clerkUserId, email, name, priceId } = input;

  const customer = await stripeClient().customers.create({
    email,
    name,
    metadata: { clerkUserId },
  });

  const subscription = await stripeClient().subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    trial_period_days: TRIAL_DAYS,
    trial_settings: {
      end_behavior: {
        // No card on file when the trial ends -> Stripe cancels for us.
        missing_payment_method: 'cancel',
      },
    },
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
  });

  const values = {
    clerkUserId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    priceId,
    status: subscription.status, // 'trialing'
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    currentPeriodEnd: periodEndOf(subscription),
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: subscriptions.clerkUserId, set: values });

  return { customerId: customer.id, subscriptionId: subscription.id };
}

/** SetupIntent client secret for the Payment Element — saves a card, no charge. */
export async function createCardSetupIntent(clerkUserId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.clerkUserId, clerkUserId));

  if (!sub) throw new Error(`No subscription found for user ${clerkUserId}`);

  const setupIntent = await stripeClient().setupIntents.create({
    customer: sub.stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: { clerkUserId },
  });

  return { clientSecret: setupIntent.client_secret };
}

/** Called after stripe.confirmSetup() succeeds — makes the card the default. */
export async function attachCardAsDefault(clerkUserId: string, paymentMethodId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.clerkUserId, clerkUserId));

  if (!sub) throw new Error(`No subscription found for user ${clerkUserId}`);

  await stripeClient().paymentMethods.attach(paymentMethodId, { customer: sub.stripeCustomerId });
  await stripeClient().customers.update(sub.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  await stripeClient().subscriptions.update(sub.stripeSubscriptionId, {
    default_payment_method: paymentMethodId,
  });

  return { ok: true };
}

/** Route-guard check — reads our own DB, never calls Stripe on the request path. */
export async function hasActiveAccess(clerkUserId: string): Promise<boolean> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.clerkUserId, clerkUserId));

  if (!sub) return false;
  return sub.status === 'trialing' || sub.status === 'active';
}

/** What the pricing page needs to decide what each plan button should do. */
export async function getBillingStatus(clerkUserId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.clerkUserId, clerkUserId));

  if (!sub) {
    return { status: 'none' as const, trialEnd: null, currentPeriodEnd: null };
  }
  return {
    status: sub.status,
    trialEnd: sub.trialEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

/**
 * For a patient whose trial already ended (status "canceled") or who never
 * started one — a real purchase, Stripe Checkout collects the card and
 * charges immediately, no trial.
 */
export async function createResubscribeCheckoutSession(
  clerkUserId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
) {
  // priceId arrives from a form/request body — only allow our own plans'
  // prices, never an arbitrary Stripe price from the account.
  if (!plans.some((p) => p.stripePriceId && p.stripePriceId === priceId)) {
    throw new Error(`Unknown priceId: ${priceId}`);
  }

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.clerkUserId, clerkUserId));

  const session = await stripeClient().checkout.sessions.create({
    mode: 'subscription',
    customer: sub?.stripeCustomerId,
    client_reference_id: clerkUserId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { clerkUserId },
    subscription_data: { metadata: { clerkUserId } },
  });

  return { url: session.url };
}
