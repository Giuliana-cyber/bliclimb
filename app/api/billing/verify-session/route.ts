import { NextResponse } from 'next/server';
import {
  SUBSCRIPTION_COOKIE_NAME,
  createSubscriptionCookieValue,
  isBillingConfigured,
  subscriptionCookieOptions
} from '@/lib/billing/subscription';
import { retrieveSubscriptionPreapproval } from '@/lib/billing/mercado-pago';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { active: false, error: 'Mercado Pago no está configurado.' },
      { status: 500 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const preapprovalId =
    searchParams.get('preapproval_id') ??
    searchParams.get('preapprovalId') ??
    searchParams.get('id');

  if (!preapprovalId) {
    return NextResponse.json({ active: false, error: 'Falta el ID de suscripción de Mercado Pago.' }, { status: 400 });
  }

  try {
    const subscription = await retrieveSubscriptionPreapproval(preapprovalId);
    const payerEmail = typeof subscription.payer_email === 'string' ? subscription.payer_email : '';
    const isActive = subscription.status === 'authorized';

    if (!isActive) {
      return NextResponse.json({
        active: false,
        status: subscription.status ?? 'unknown',
        message: 'Mercado Pago todavía no reporta esta suscripción como autorizada.'
      });
    }

    const response = NextResponse.json({
      active: true,
      payerEmail,
      subscriptionId: subscription.id
    });

    response.cookies.set(
      SUBSCRIPTION_COOKIE_NAME,
      createSubscriptionCookieValue({
        subscriptionId: subscription.id,
        payerEmail
      }),
      subscriptionCookieOptions
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos verificar la suscripción en Mercado Pago.';
    return NextResponse.json({ active: false, error: message }, { status: 500 });
  }
}
