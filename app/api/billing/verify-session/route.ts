import { NextResponse } from 'next/server';
import {
  SUBSCRIPTION_COOKIE_NAME,
  createSubscriptionCookieValue,
  isBillingConfigured,
  subscriptionCookieOptions
} from '@/lib/billing/subscription';
import { retrieveCheckoutSession } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { active: false, error: 'Stripe billing is not configured.' },
      { status: 500 }
    );
  }

  const sessionId = new URL(request.url).searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ active: false, error: 'Missing session_id.' }, { status: 400 });
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    const customerId = typeof session.customer === 'string' ? session.customer : '';
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : '';
    const isActive = session.status === 'complete' && session.payment_status === 'paid' && Boolean(subscriptionId);

    if (!isActive) {
      return NextResponse.json({ active: false, status: session.status }, { status: 402 });
    }

    const response = NextResponse.json({
      active: true,
      customerId,
      subscriptionId
    });

    response.cookies.set(
      SUBSCRIPTION_COOKIE_NAME,
      createSubscriptionCookieValue({
        sessionId: session.id,
        subscriptionId,
        customerId
      }),
      subscriptionCookieOptions
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify checkout session.';
    return NextResponse.json({ active: false, error: message }, { status: 500 });
  }
}
