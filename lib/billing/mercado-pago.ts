const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

export type MercadoPagoPreapproval = {
  id: string;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  status?: string | null;
  payer_email?: string | null;
  external_reference?: string | null;
};

type MercadoPagoErrorPayload = {
  message?: string;
  error?: string;
  cause?: Array<{
    code?: string;
    description?: string;
    message?: string;
  }>;
};

function getAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN is required for billing.');
  }

  return accessToken;
}

function getAppBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const requestOrigin = new URL(requestUrl).origin;

  if (
    configuredUrl &&
    !configuredUrl.includes('localhost') &&
    !configuredUrl.includes('127.0.0.1')
  ) {
    return configuredUrl.replace(/\/$/, '');
  }

  return requestOrigin;
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

export function getBillingDisplayConfig() {
  return {
    amount: getSubscriptionAmount(),
    currency: getCurrencyId(),
    sandbox: process.env.MERCADO_PAGO_USE_SANDBOX === 'true'
  };
}

export function getMercadoPagoCheckoutUrl(subscription: MercadoPagoPreapproval) {
  if (process.env.MERCADO_PAGO_USE_SANDBOX === 'true') {
    return subscription.sandbox_init_point ?? subscription.init_point ?? null;
  }

  return subscription.init_point ?? subscription.sandbox_init_point ?? null;
}

function getMercadoPagoErrorMessage(data: MercadoPagoErrorPayload) {
  const causeMessage = data.cause
    ?.map((item) => item.description ?? item.message ?? item.code)
    .filter(Boolean)
    .join(' ');

  return data.message ?? data.error ?? causeMessage ?? 'Mercado Pago no pudo procesar la solicitud.';
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

  const responseText = await response.text();
  let data = {} as T & MercadoPagoErrorPayload;

  try {
    data = responseText
      ? (JSON.parse(responseText) as T & MercadoPagoErrorPayload)
      : ({} as T & MercadoPagoErrorPayload);
  } catch {
    data = { message: responseText } as T & MercadoPagoErrorPayload;
  }

  if (!response.ok) {
    throw new Error(getMercadoPagoErrorMessage(data));
  }

  return data as T;
}

export async function createSubscriptionPreapproval({
  email,
  requestUrl,
  userId
}: {
  email: string;
  requestUrl: string;
  /**
   * Identificador del usuario autenticado en Supabase. Se envía como
   * `external_reference` a Mercado Pago para que el webhook pueda hacer
   * el binding entre el pago y la fila en `entitlements`.
   */
  userId: string;
}) {
  const appBaseUrl = getAppBaseUrl(requestUrl);

  return mercadoPagoRequest<MercadoPagoPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: 'BilClimb.ai Pro',
      payer_email: email,
      external_reference: userId,
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

/**
 * Cancela una suscripción en Mercado Pago.
 *
 * Llamar siempre desde server-side — requiere `MERCADO_PAGO_ACCESS_TOKEN`,
 * que no debe llegar al cliente.
 *
 * Después de cancelar, MP dispara un webhook `subscription_preapproval.updated`
 * con `status: 'cancelled'` que actualiza la fila de `entitlements`. El
 * `current_period_end` se conserva → el usuario mantiene acceso hasta el final
 * del período pagado.
 */
export async function cancelSubscriptionPreapproval(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(
    `/preapproval/${encodeURIComponent(preapprovalId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    }
  );
}
