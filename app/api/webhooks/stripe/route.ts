// Webhook de Stripe.
//
// Reusa `public.webhook_events` para idempotencia (request_id = event.id).
// Valida firma con stripe.webhooks.constructEvent (necesita el raw body, NO
// el JSON parseado).
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findEntitlementByStripeCustomerId,
  markStripePastDue,
  markStripeSubscriptionCancelled,
  updateStripePeriodEnd,
  upsertFromStripeSubscription,
  upsertStripeCustomer,
  type StripeSubscriptionLike
} from '@/lib/entitlements';
import { coachTierFromPriceId, getStripe, getStripeWebhookSecret } from '@/lib/billing/stripe';
import { applyCoachSubscription, clearCoachSubscription } from '@/lib/coach';

export const runtime = 'nodejs';

type Outcome = {
  action_taken:
    | 'ignored_unhandled_event'
    | 'ignored_missing_user_id'
    | 'customer_attached'
    | 'subscription_synced'
    | 'coach_subscription_synced'
    | 'subscription_cancelled'
    | 'coach_subscription_cancelled'
    | 'period_extended'
    | 'marked_past_due';
  coach_tier?: 'starter' | 'pro' | 'gym';
  user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
};

function log(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ kind: 'stripe_webhook', ts: new Date().toISOString(), ...payload })
  );
}

async function recordEventOrDedup(
  requestId: string,
  eventType: string,
  payload: unknown
): Promise<{ alreadyProcessed: boolean }> {
  const admin = createAdminClient();
  type Inserter = {
    insert: (
      values: Record<string, unknown>
    ) => PromiseLike<{ error: { code?: string; message?: string } | null }>;
  };
  const fromUntyped = (
    admin as unknown as { from: (t: string) => Inserter }
  ).from('webhook_events');
  const { error } = await fromUntyped.insert({
    request_id: requestId,
    provider: 'stripe',
    event_type: eventType,
    payload
  });
  if (!error) return { alreadyProcessed: false };
  if ((error as { code?: string }).code === '23505') {
    return { alreadyProcessed: true };
  }
  throw new Error(`webhook_events insert failed: ${error.message}`);
}

/**
 * Resuelve el supabase_user_id mirando varias rutas: metadata del evento o
 * de la subscription, customer.metadata, y como último recurso un lookup en
 * entitlements por stripe_customer_id.
 */
async function resolveUserId(
  stripe: Stripe,
  metadata: Record<string, string | null | undefined> | null | undefined,
  customerId: string | null,
  fallbackSubscriptionMetadata?: Record<string, string | null | undefined> | null
): Promise<string | null> {
  const direct = metadata?.supabase_user_id ?? fallbackSubscriptionMetadata?.supabase_user_id;
  if (direct) return direct;

  if (customerId) {
    const existing = await findEntitlementByStripeCustomerId(customerId);
    if (existing) return existing.profile_id;

    // Última opción: leer el customer de Stripe y revisar su metadata.
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!('deleted' in customer) || customer.deleted !== true) {
        const fromMeta = (customer as Stripe.Customer).metadata?.supabase_user_id;
        if (fromMeta) return fromMeta;
      }
    } catch {
      // Si retrieve falla seguimos con null — el outcome marcará missing user.
    }
  }
  return null;
}

function getCustomerIdString(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if ('id' in customer) return customer.id;
  return null;
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  event: Stripe.CheckoutSessionCompletedEvent
): Promise<Outcome> {
  const session = event.data.object;
  const customerId = getCustomerIdString(session.customer);
  const userId = await resolveUserId(stripe, session.metadata ?? null, customerId);

  if (!userId) {
    return { action_taken: 'ignored_missing_user_id', stripe_customer_id: customerId ?? undefined };
  }
  if (!customerId) {
    return { action_taken: 'ignored_missing_user_id', user_id: userId };
  }

  await upsertStripeCustomer(userId, customerId);
  return {
    action_taken: 'customer_attached',
    user_id: userId,
    stripe_customer_id: customerId
  };
}

async function handleSubscriptionUpsert(
  stripe: Stripe,
  event:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
): Promise<Outcome> {
  const subscription = event.data.object;
  const customerId = getCustomerIdString(subscription.customer);
  const userId = await resolveUserId(
    stripe,
    subscription.metadata ?? null,
    customerId
  );

  if (!userId) {
    return {
      action_taken: 'ignored_missing_user_id',
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: subscription.id
    };
  }

  await upsertFromStripeSubscription(userId, subscription as unknown as StripeSubscriptionLike);

  // Si el price_id corresponde a un tier de coach, además del entitlement
  // standard hay que setear profiles.role='coach' y entitlements.coach_*.
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const coachTier = coachTierFromPriceId(priceId);
  if (coachTier) {
    await applyCoachSubscription(userId, coachTier);
    return {
      action_taken: 'coach_subscription_synced',
      user_id: userId,
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: subscription.id,
      coach_tier: coachTier
    };
  }

  return {
    action_taken: 'subscription_synced',
    user_id: userId,
    stripe_customer_id: customerId ?? undefined,
    stripe_subscription_id: subscription.id
  };
}

async function handleSubscriptionDeleted(
  stripe: Stripe,
  event: Stripe.CustomerSubscriptionDeletedEvent
): Promise<Outcome> {
  const subscription = event.data.object;
  await markStripeSubscriptionCancelled(subscription.id);

  // Si era una suscripción de coach, revertir role + tier.
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const coachTier = coachTierFromPriceId(priceId);
  if (coachTier) {
    const customerId = getCustomerIdString(subscription.customer);
    const userId = await resolveUserId(
      stripe,
      subscription.metadata ?? null,
      customerId
    );
    if (userId) {
      await clearCoachSubscription(userId);
      return {
        action_taken: 'coach_subscription_cancelled',
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId ?? undefined,
        coach_tier: coachTier
      };
    }
  }

  return {
    action_taken: 'subscription_cancelled',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: getCustomerIdString(subscription.customer) ?? undefined
  };
}

async function handleInvoicePaymentSucceeded(
  event: Stripe.InvoicePaymentSucceededEvent
): Promise<Outcome> {
  const invoice = event.data.object as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    period_end?: number | null;
  };
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const periodEnd = invoice.period_end ?? invoice.lines?.data?.[0]?.period?.end ?? null;

  if (!subscriptionId) {
    return { action_taken: 'ignored_unhandled_event' };
  }

  await updateStripePeriodEnd(subscriptionId, periodEnd);
  return {
    action_taken: 'period_extended',
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: getCustomerIdString(invoice.customer) ?? undefined
  };
}

async function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent
): Promise<Outcome> {
  const invoice = event.data.object as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  if (!subscriptionId) {
    return { action_taken: 'ignored_unhandled_event' };
  }
  await markStripePastDue(subscriptionId);
  return {
    action_taken: 'marked_past_due',
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: getCustomerIdString(invoice.customer) ?? undefined
  };
}

export async function POST(request: Request) {
  // 1. Raw body (Stripe firma sobre el cuerpo exacto)
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    log({ event: 'missing_signature' });
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  let secret: string;
  try {
    secret = getStripeWebhookSecret();
  } catch {
    log({ event: 'webhook_secret_missing' });
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const stripe = getStripe();

  // 2. Verificar firma + parsear evento
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid';
    log({ event: 'signature_invalid', message });
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // 3. Idempotencia con webhook_events
  let dedup: { alreadyProcessed: boolean };
  try {
    dedup = await recordEventOrDedup(event.id, event.type, event);
  } catch (error) {
    log({
      event: 'persist_failed',
      message: error instanceof Error ? error.message : 'unknown'
    });
    // 500 hace que Stripe reintente.
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  if (dedup.alreadyProcessed) {
    log({ event: 'duplicate', request_id: event.id, event_type: event.type });
    return NextResponse.json({ ok: true, deduped: true });
  }

  // 4. Procesar
  let outcome: Outcome = { action_taken: 'ignored_unhandled_event' };
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        outcome = await handleCheckoutCompleted(stripe, event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        outcome = await handleSubscriptionUpsert(stripe, event);
        break;
      case 'customer.subscription.deleted':
        outcome = await handleSubscriptionDeleted(stripe, event);
        break;
      case 'invoice.payment_succeeded':
        outcome = await handleInvoicePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        outcome = await handleInvoicePaymentFailed(event);
        break;
      default:
        outcome = { action_taken: 'ignored_unhandled_event' };
    }
  } catch (error) {
    log({
      event: 'processing_error',
      event_type: event.type,
      request_id: event.id,
      message: error instanceof Error ? error.message : 'unknown'
    });
    // 500 fuerza retry, pero la fila de webhook_events ya quedó persistida y
    // el siguiente reintento entra a alreadyProcessed = true. Si querés
    // forzar retry, hay que borrar manualmente la fila desde Supabase.
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }

  log({
    event_type: event.type,
    request_id: event.id,
    ...outcome
  });
  return NextResponse.json({ ok: true });
}
