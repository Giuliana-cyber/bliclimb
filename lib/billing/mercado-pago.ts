const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

export type MercadoPagoPreapproval = {
  id: string;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  status?: string | null;
  payer_email?: string | null;
  external_reference?: string | null;
};

function getAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN is required for billing.');
  }

  return accessToken;
}

function getAppBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(requestUrl).origin;
}

function getSubscriptionAmount() {
  const amount = Number(process.env.MERCADO_PAGO_SUBSCRIPTION_AMOUNT ?? '1');

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('MERCADO_PAGO_SUBSCRIPTION_AMOUNT must be a positive number.');
  }

  return amount;
}

function getCurrencyId() {
  return process.env.MERCADO_PAGO_CURRENCY ?? 'USD';
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });

  const data = (await response.json()) as T & { message?: string; error?: string; cause?: unknown };

  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? 'Mercado Pago request failed.');
  }

  return data as T;
}

export async function createSubscriptionPreapproval({
  email,
  requestUrl
}: {
  email: string;
  requestUrl: string;
}) {
  const appBaseUrl = getAppBaseUrl(requestUrl);

  return mercadoPagoRequest<MercadoPagoPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: 'BilClimb.ai Pro',
      payer_email: email,
      external_reference: `bilclimb-${crypto.randomUUID()}`,
      back_url: `${appBaseUrl}/billing/success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: getSubscriptionAmount(),
        currency_id: getCurrencyId()
      },
      status: 'pending'
    })
  });
}

export async function retrieveSubscriptionPreapproval(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(
    `/preapproval/${encodeURIComponent(preapprovalId)}`
  );
}
