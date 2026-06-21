// /api/billing/status — estado de billing para el cliente.
//
// Fuente de verdad: Stripe (configuración) + tabla `entitlements` en Supabase.
// El endpoint NO consulta Mercado Pago (legacy) ni la API de Stripe directamente —
// el webhook ya sincroniza el estado de la suscripción a la DB.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasActiveSubscription } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BILLING = {
  monthlyAmount: 29,
  annualAmount: 249,
  currency: 'MXN',
  trialDays: 30
} as const;

export async function GET() {
  const configured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const required = process.env.REQUIRE_SUBSCRIPTION === 'true';

  // Sin auth no podemos resolver `active`. Devolvemos active=false sin error
  // (el cliente trata "no autenticado" igual que "sin suscripción").
  let active = false;
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      active = await hasActiveSubscription(user.id, createAdminClient());
    }
  } catch {
    // Falla silenciosa — UI cae a active=false.
    active = false;
  }

  return NextResponse.json({
    active,
    configured,
    required,
    billing: BILLING
  });
}
