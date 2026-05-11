import { NextResponse } from 'next/server';
import { isBillingConfigured } from '@/lib/billing/subscription';
import { createCheckoutSession } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Stripe billing is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID.' },
      { status: 500 }
    );
  }

  try {
    const session = await createCheckoutSession(request.url);

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
