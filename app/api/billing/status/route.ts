import { NextResponse } from 'next/server';
import { getSubscriptionAccess } from '@/lib/billing/subscription';
import { getBillingDisplayConfig } from '@/lib/billing/mercado-pago';

export const runtime = 'nodejs';

export async function GET() {
  const access = getSubscriptionAccess();
  let billing: ReturnType<typeof getBillingDisplayConfig> | null = null;
  let configError = '';

  try {
    billing = access.configured ? getBillingDisplayConfig() : null;
  } catch (error) {
    configError = error instanceof Error ? error.message : 'La configuración de Mercado Pago no es válida.';
  }

  return NextResponse.json({
    active: access.active,
    configured: access.configured && !configError,
    required: access.required,
    billing,
    configError: configError || null,
    subscription: access.subscription
      ? {
          payerEmail: access.subscription.payerEmail,
          expiresAt: access.subscription.expiresAt
        }
      : null
  });
}
