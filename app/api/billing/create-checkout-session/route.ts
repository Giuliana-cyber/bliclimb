// Endpoint de checkout — Stripe Subscription Checkout Session.
//
// Migración: este archivo manejaba antes el flujo de Mercado Pago / preapproval.
// La cuenta de MP quedó bloqueada con PA_UNAUTHORIZED_RESULT_FROM_POLICIES, así
// que el flujo activo es Stripe ($249 MXN/año con 30 días de trial gestionados
// por Stripe). El código de MP queda en lib/billing/mercado-pago.ts marcado
// como legacy.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findEntitlementByStripeCustomerId,
  getEntitlement,
  upsertStripeCustomer
} from '@/lib/entitlements';
import { getStripe, getStripePriceId } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

const BodySchema = z.object({
  email: z.string().email()
});

type LogPayload = Record<string, unknown>;

function log(payload: LogPayload) {
  console.log(JSON.stringify({ kind: 'stripe_checkout', ts: new Date().toISOString(), ...payload }));
}

function getAppBaseUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    configured &&
    !configured.includes('localhost') &&
    !configured.includes('127.0.0.1')
  ) {
    return configured.replace(/\/$/, '');
  }
  return new URL(requestUrl).origin;
}

async function resolveStripeCustomerId(
  stripe: Stripe,
  userId: string,
  email: string
): Promise<string> {
  const admin = createAdminClient();
  const entitlement = await getEntitlement(userId, admin);

  if (entitlement.stripe_customer_id) {
    return entitlement.stripe_customer_id;
  }

  // Por idempotencia: si por alguna razón otro request creó el customer entre
  // medio (race), preferimos reusar antes de crear duplicados en Stripe.
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId }
  });

  // Doble-check anti-race: si otro request escribió primero, no pisamos.
  const existing = await findEntitlementByStripeCustomerId(customer.id, admin);
  if (existing && existing.profile_id !== userId) {
    log({
      event: 'customer_collision',
      userId,
      foundUserId: existing.profile_id,
      customerId: customer.id
    });
  }
  await upsertStripeCustomer(userId, customer.id, admin);
  return customer.id;
}

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { code: 'auth_required', error: 'Iniciá sesión antes de suscribirte.' },
      { status: 401 }
    );
  }

  // 2. Body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_payload', issues: [{ message: 'Body no es JSON válido.' }] },
      { status: 400 }
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_payload',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }
  const email = parsed.data.email;

  // 3. Resolve/Create Stripe customer + checkout session
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    log({
      event: 'stripe_misconfigured',
      message: error instanceof Error ? error.message : 'unknown'
    });
    return NextResponse.json(
      { error: 'payment_provider_misconfigured' },
      { status: 500 }
    );
  }

  const appBase = getAppBaseUrl(request.url);

  try {
    const customerId = await resolveStripeCustomerId(stripe, user.id, email);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      subscription_data: {
        // El trial de 30 días vive en el Price de Stripe (configurado en el
        // dashboard como `trial_period_days: 30`). Stripe lo aplica al
        // checkout automáticamente sin necesidad de `trial_from_plan` (que
        // está deprecado en versiones nuevas del SDK). Si quisiéramos forzar
        // un trial distinto desde código, usaríamos `trial_period_days` acá.
        metadata: { supabase_user_id: user.id }
      },
      success_url: `${appBase}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBase}/subscribe`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true
    });

    if (!session.url) {
      log({ event: 'no_checkout_url', sessionId: session.id });
      return NextResponse.json(
        { error: 'payment_provider_error', detail: 'Stripe no devolvió un URL de checkout.' },
        { status: 502 }
      );
    }

    log({
      event: 'session_created',
      userId: user.id,
      customerId,
      sessionId: session.id
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    log({
      event: 'stripe_error',
      userId: user.id,
      detail
    });
    return NextResponse.json(
      { error: 'payment_provider_error', detail },
      { status: 502 }
    );
  }
}
