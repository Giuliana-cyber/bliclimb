import { NextResponse } from 'next/server';
import { isBillingConfigured } from '@/lib/billing/subscription';
import {
  createSubscriptionPreapproval,
  getBillingDisplayConfig,
  getMercadoPagoCheckoutUrl
} from '@/lib/billing/mercado-pago';
import { createClient } from '@/lib/supabase/server';
import {
  findEntitlementBySubscriptionId,
  getEntitlement,
  upsertEntitlementFromWebhook
} from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Mercado Pago no está configurado. Agrega MERCADO_PAGO_ACCESS_TOKEN en Vercel y haz redeploy.' },
      { status: 500 }
    );
  }

  // El binding userId ↔ subscription_id requiere usuario autenticado.
  // Sin esto, el webhook de MP no sabe a qué fila de entitlements pertenece el pago.
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        code: 'auth_required',
        error: 'Iniciá sesión antes de suscribirte para que vinculemos el pago a tu cuenta.'
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Ingresa un email válido para Mercado Pago.' },
        { status: 400 }
      );
    }

    // Pre-creamos / aseguramos el row de entitlements antes de crear la preapproval.
    // El webhook luego hará el upsert con el subscription_id real.
    const admin = createAdminClient();
    await getEntitlement(user.id, admin);

    const subscription = await createSubscriptionPreapproval({
      email,
      requestUrl: request.url,
      userId: user.id
    });
    const url = getMercadoPagoCheckoutUrl(subscription);

    if (!url) {
      return NextResponse.json(
        { error: 'Mercado Pago creó la suscripción, pero no devolvió un enlace de checkout.' },
        { status: 502 }
      );
    }

    // Pre-binding: dejamos guardado el preapproval_id en estado 'pending' para
    // que /billing/success pueda hacer un poll y mostrar feedback al usuario
    // si el webhook aún no llega.
    const existing = await findEntitlementBySubscriptionId(subscription.id, admin);
    if (!existing) {
      await upsertEntitlementFromWebhook(
        {
          profile_id: user.id,
          provider_subscription_id: subscription.id,
          payer_email: email,
          status: 'pending',
          current_period_end: null
        },
        admin
      );
    }

    return NextResponse.json({
      preapprovalId: subscription.id,
      url,
      billing: getBillingDisplayConfig()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos crear la suscripción en Mercado Pago.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
