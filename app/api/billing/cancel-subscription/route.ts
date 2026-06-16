import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelSubscriptionPreapproval } from '@/lib/billing/mercado-pago';
import { getEntitlement, upsertEntitlementFromWebhook } from '@/lib/entitlements';

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

  if (entitlement.status !== 'active' || !entitlement.provider_subscription_id) {
    return NextResponse.json(
      {
        code: 'not_cancellable',
        error: 'No tenés una suscripción activa para cancelar.'
      },
      { status: 400 }
    );
  }

  try {
    await cancelSubscriptionPreapproval(entitlement.provider_subscription_id);
  } catch (error) {
    return NextResponse.json(
      {
        code: 'mp_cancel_failed',
        error:
          error instanceof Error
            ? error.message
            : 'Mercado Pago rechazó la cancelación. Intentá de nuevo en unos minutos.'
      },
      { status: 502 }
    );
  }

  // El webhook de MP va a confirmar y actualizar el row. Mientras tanto, dejamos
  // la entitlement en 'cancelled' optimistamente para que /settings refleje el
  // estado de inmediato. current_period_end NO se toca — el usuario sigue con
  // acceso hasta esa fecha.
  await upsertEntitlementFromWebhook(
    {
      profile_id: user.id,
      provider_subscription_id: entitlement.provider_subscription_id,
      payer_email: entitlement.payer_email,
      status: 'cancelled',
      current_period_end: entitlement.current_period_end
    },
    admin
  );

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
