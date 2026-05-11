const STRIPE_API_BASE = 'https://api.stripe.com/v1';

type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer?: string | null;
  subscription?: string | null;
};

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for billing.');
  }

  return secretKey;
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is required for billing.');
  }

  return priceId;
}

function getAppBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(requestUrl).origin;
}

async function stripeRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      ...init?.headers
    }
  });

  const data = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Stripe request failed.');
  }

  return data as T;
}

export async function createCheckoutSession(requestUrl: string) {
  const appBaseUrl = getAppBaseUrl(requestUrl);
  const body = new URLSearchParams({
    mode: 'subscription',
    submit_type: 'subscribe',
    success_url: `${appBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appBaseUrl}/subscribe?canceled=1`,
    'line_items[0][price]': getStripePriceId(),
    'line_items[0][quantity]': '1',
    'metadata[product]': 'bilclimb_mvp'
  });

  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}
