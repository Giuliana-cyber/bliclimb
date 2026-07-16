// /api/coach/upgrade — crea una Stripe Checkout Session para suscripción de coach.
//
// Reusa el customer del usuario (si ya existe en entitlements). Al completarse
// el pago, el webhook detecta el price_id de coach y aplica el rol + tier.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findEntitlementByStripeCustomerId,
  getEntitlement,
  upsertStripeCustomer
} from '@/lib/entitlements';
import {
  getStripe,
  getStripeCoachPriceId,
  type CoachTier
} from '@/lib/billing/stripe';

export const runtime = 'nodejs';

// Defensa en profundidad · 2026-07-15 · igual que en billing/create-checkout-session.
function isMaintenance(): boolean {
  return process.env.MAINTENANCE_MODE === '1';
}

const BodySchema = z.object({
  email: z.string().email(),
  tier: z.enum(['starter', 'pro', 'gym'])
});

function log(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ kind: 'coach_upgrade', ts: new Date().toISOString(), ...payload })
  );
}

function getAppBaseUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
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
  if (entitlement.stripe_customer_id) return entitlement.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId }
  });
  const existing = await findEntitlementByStripeCustomerId(customer.id, admin);
  if (existing && existing.profile_id !== userId) {
    log({ event: 'customer_collision', userId, foundUserId: existing.profile_id });
  }
  await upsertStripeCustomer(userId, customer.id, admin);
  return customer.id;
}

export async function POST(request: Request) {
  // 0. Modo mantenimiento — nunca abrimos checkout si la app está cerrada.
  if (isMaintenance()) {
    log({ event: 'blocked_maintenance' });
    return NextResponse.json(
      {
        code: 'service_unavailable',
        error: 'BilClimb está en mantenimiento. Volvemos pronto.'
      },
      { status: 503, headers: { 'retry-after': '86400' } }
    );
  }

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
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      },
      { status: 400 }
    );
  }
  const { email, tier } = parsed.data;

  // 3. Stripe checkout
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    log({ event: 'stripe_misconfigured', message: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'payment_provider_misconfigured' }, { status: 500 });
  }

  let priceId: string;
  try {
    priceId = getStripeCoachPriceId(tier);
  } catch (envError) {
    log({
      event: 'price_id_missing',
      tier,
      message: envError instanceof Error ? envError.message : 'unknown'
    });
    return NextResponse.json(
      { error: 'payment_provider_misconfigured', detail: 'price id missing' },
      { status: 500 }
    );
  }

  const appBase = getAppBaseUrl(request.url);

  try {
    const customerId = await resolveStripeCustomerId(stripe, user.id, email);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        // Trial explícito de 30 días para que el coach pruebe el panel
        // antes del primer cobro.
        trial_period_days: 30,
        metadata: { supabase_user_id: user.id, coach_tier: tier }
      },
      success_url: `${appBase}/coach/dashboard?welcome=1`,
      cancel_url: `${appBase}/coach/upgrade`,
      metadata: { supabase_user_id: user.id, coach_tier: tier as CoachTier },
      allow_promotion_codes: true
    });

    if (!session.url) {
      log({ event: 'no_checkout_url', sessionId: session.id });
      return NextResponse.json(
        { error: 'payment_provider_error', detail: 'Stripe no devolvió URL.' },
        { status: 502 }
      );
    }

    log({ event: 'session_created', userId: user.id, tier, priceId, sessionId: session.id });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    log({ event: 'stripe_error', userId: user.id, tier, detail });
    return NextResponse.json({ error: 'payment_provider_error', detail }, { status: 502 });
  }
}
