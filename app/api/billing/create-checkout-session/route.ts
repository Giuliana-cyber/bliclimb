import { NextResponse } from 'next/server';
import { isBillingConfigured } from '@/lib/billing/subscription';
import { createSubscriptionPreapproval } from '@/lib/billing/mercado-pago';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Mercado Pago billing is not configured. Add MERCADO_PAGO_ACCESS_TOKEN.' },
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
    const url = process.env.MERCADO_PAGO_USE_SANDBOX === 'true'
      ? subscription.sandbox_init_point
      : subscription.init_point ?? subscription.sandbox_init_point;

    if (!url) {
      return NextResponse.json(
        { error: 'Mercado Pago did not return a checkout URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ preapprovalId: subscription.id, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Mercado Pago subscription.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
