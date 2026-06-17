// Cancelación de suscripción — server-side llama a Stripe con
// cancel_at_period_end=true. El webhook customer.subscription.updated
// confirma la transición y persiste el estado en entitlements.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEntitlement, markStripeSubscriptionCancelled } from '@/lib/entitlements';
import { getStripe } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: 'auth_required', error: 'Iniciá sesión para cancelar tu suscripción.' },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const entitlement = await getEntitlement(user.id, admin);

  if (entitlement.status !== 'active' || !entitlement.stripe_subscription_id) {
    return NextResponse.json(
      {
        code: 'not_cancellable',
        error: 'No tenés una suscripción activa para cancelar.'
      },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(entitlement.stripe_subscription_id, {
      cancel_at_period_end: true
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return NextResponse.json(
      {
        code: 'payment_provider_error',
        error: 'Stripe rechazó la cancelación.',
        detail
      },
      { status: 502 }
    );
  }

  // Optimistamente marcamos 'cancelled' (preservando current_period_end) para
  // que /settings refleje el cambio de inmediato. El webhook confirma después.
  await markStripeSubscriptionCancelled(entitlement.stripe_subscription_id, admin);

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
