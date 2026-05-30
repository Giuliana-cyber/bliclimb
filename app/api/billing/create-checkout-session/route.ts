import { NextResponse } from 'next/server';
import { isBillingConfigured } from '@/lib/billing/subscription';
import {
  createSubscriptionPreapproval,
  getBillingDisplayConfig,
  getMercadoPagoCheckoutUrl
} from '@/lib/billing/mercado-pago';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Mercado Pago no está configurado. Agrega MERCADO_PAGO_ACCESS_TOKEN en Vercel y haz redeploy.' },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un email válido para Mercado Pago.' }, { status: 400 });
    }

    const subscription = await createSubscriptionPreapproval({
      email,
      requestUrl: request.url
    });
    const url = getMercadoPagoCheckoutUrl(subscription);

    if (!url) {
      return NextResponse.json(
        { error: 'Mercado Pago creó la suscripción, pero no devolvió un enlace de checkout.' },
        { status: 502 }
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
