import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findEntitlementBySubscriptionId,
  upsertEntitlementFromWebhook,
  type EntitlementStatus
} from '@/lib/entitlements';
import {
  inferPeriodEnd,
  mapPaymentStatus,
  mapPreapprovalStatus,
  verifyMercadoPagoSignature,
  type MpNotification,
  type MpPayment,
  type MpPreapproval
} from '@/lib/billing/mp-webhook';

export const runtime = 'nodejs';

const MP_API_BASE = 'https://api.mercadopago.com';

type WebhookOutcome = {
  action_taken:
    | 'ignored_unknown_type'
    | 'ignored_no_status_mapping'
    | 'ignored_missing_external_reference'
    | 'entitlement_updated';
  status?: EntitlementStatus;
  subscription_id?: string;
  profile_id?: string;
};

function log(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ kind: 'mp_webhook', ts: new Date().toISOString(), ...payload })
  );
}

async function fetchMp<T>(path: string): Promise<T | null> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return null;
  const response = await fetch(`${MP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    log({
      event: 'mp_fetch_failed',
      path,
      status: response.status
    });
    return null;
  }
  return (await response.json()) as T;
}

async function recordWebhook(
  client: ReturnType<typeof createAdminClient>,
  requestId: string,
  eventType: string | undefined,
  payload: unknown
): Promise<{ alreadyProcessed: boolean }> {
  // El cliente admin es untyped (no usamos generated Database types todavía).
  // El builder de supabase-js infiere `never` cuando no hay schema, así que
  // bajamos a un tipo estructural mínimo para esta tabla.
  type Inserter = {
    insert: (
      values: Record<string, unknown>
    ) => PromiseLike<{ error: { code?: string; message?: string } | null }>;
  };
  const fromUntyped = (
    client as unknown as { from: (t: string) => Inserter }
  ).from('webhook_events');
  const { error } = await fromUntyped.insert({
    request_id: requestId,
    provider: 'mercado_pago',
    event_type: eventType ?? null,
    payload
  });

  if (!error) {
    return { alreadyProcessed: false };
  }

  // 23505 = unique_violation en Postgres. Idempotencia: si ya está, no procesar de nuevo.
  if ((error as { code?: string }).code === '23505') {
    return { alreadyProcessed: true };
  }

  throw new Error(`webhook_events insert failed: ${error.message}`);
}

async function handlePaymentEvent(
  paymentId: string
): Promise<WebhookOutcome> {
  const payment = await fetchMp<MpPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!payment) {
    return { action_taken: 'ignored_no_status_mapping' };
  }

  const status = mapPaymentStatus(payment.status);
  if (!status) {
    return { action_taken: 'ignored_no_status_mapping' };
  }

  const preapprovalId = payment.preapproval_id ?? null;
  const externalRef = payment.external_reference ?? null;
  const profileId = externalRef ?? (preapprovalId ? null : null);

  // Resolver profileId: o external_reference del payment, o lookup por preapproval_id.
  let resolvedProfileId = profileId;
  let preapproval: MpPreapproval | null = null;

  if (preapprovalId) {
    preapproval = await fetchMp<MpPreapproval>(
      `/preapproval/${encodeURIComponent(preapprovalId)}`
    );
    if (!resolvedProfileId && preapproval?.external_reference) {
      resolvedProfileId = preapproval.external_reference;
    }
    if (!resolvedProfileId) {
      const existing = await findEntitlementBySubscriptionId(preapprovalId);
      if (existing) resolvedProfileId = existing.profile_id;
    }
  }

  if (!resolvedProfileId) {
    return { action_taken: 'ignored_missing_external_reference' };
  }

  const periodEnd = inferPeriodEnd(preapproval, new Date());
  await upsertEntitlementFromWebhook({
    profile_id: resolvedProfileId,
    provider_subscription_id: preapprovalId ?? `payment:${payment.id}`,
    payer_email: payment.payer?.email ?? null,
    status,
    current_period_end: periodEnd
  });

  return {
    action_taken: 'entitlement_updated',
    status,
    subscription_id: preapprovalId ?? `payment:${payment.id}`,
    profile_id: resolvedProfileId
  };
}

async function handlePreapprovalEvent(
  preapprovalId: string
): Promise<WebhookOutcome> {
  const preapproval = await fetchMp<MpPreapproval>(
    `/preapproval/${encodeURIComponent(preapprovalId)}`
  );
  if (!preapproval) {
    return { action_taken: 'ignored_no_status_mapping' };
  }

  const status = mapPreapprovalStatus(preapproval.status);
  if (!status) {
    return { action_taken: 'ignored_no_status_mapping' };
  }

  let profileId = preapproval.external_reference ?? null;
  if (!profileId) {
    const existing = await findEntitlementBySubscriptionId(preapprovalId);
    if (existing) profileId = existing.profile_id;
  }
  if (!profileId) {
    return { action_taken: 'ignored_missing_external_reference' };
  }

  // En cancelled/paused mantenemos el current_period_end existente; en active
  // recalculamos.
  let periodEnd: string | null = null;
  if (status === 'active') {
    periodEnd = inferPeriodEnd(preapproval, new Date());
  } else {
    const existing = await findEntitlementBySubscriptionId(preapprovalId);
    periodEnd = existing?.current_period_end ?? null;
  }

  await upsertEntitlementFromWebhook({
    profile_id: profileId,
    provider_subscription_id: preapprovalId,
    payer_email: preapproval.payer_email ?? null,
    status,
    current_period_end: periodEnd
  });

  return {
    action_taken: 'entitlement_updated',
    status,
    subscription_id: preapprovalId,
    profile_id: profileId
  };
}

export async function POST(request: Request) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  let bodyText = '';
  let body: MpNotification = {};
  try {
    bodyText = await request.text();
    body = bodyText ? (JSON.parse(bodyText) as MpNotification) : {};
  } catch {
    log({ event: 'invalid_json' });
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const dataId = body.data?.id ?? null;

  const signature = verifyMercadoPagoSignature({
    xSignature,
    xRequestId,
    dataId,
    secret
  });
  if (!signature.valid) {
    log({ event: 'signature_invalid', reason: signature.reason });
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const requestId = xRequestId as string;
  const eventType = body.action ?? body.type ?? body.topic ?? null;

  const supabase = createAdminClient();
  const { alreadyProcessed } = await recordWebhook(
    supabase,
    requestId,
    eventType ?? undefined,
    body
  );

  if (alreadyProcessed) {
    log({ event: 'duplicate', requestId });
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const kind = (body.type ?? body.topic ?? '').toLowerCase();
    let outcome: WebhookOutcome = { action_taken: 'ignored_unknown_type' };

    if (kind === 'payment') {
      outcome = await handlePaymentEvent(String(dataId));
    } else if (
      kind === 'subscription_preapproval' ||
      kind === 'preapproval' ||
      kind === 'subscription'
    ) {
      outcome = await handlePreapprovalEvent(String(dataId));
    }

    log({
      event_type: eventType,
      request_id: requestId,
      ...outcome
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    log({
      event: 'processing_error',
      message: error instanceof Error ? error.message : 'unknown',
      request_id: requestId
    });
    // 500 hace que MP reintente. La fila de webhook_events queda persistida con la
    // entrega original; el siguiente intento entrará a `alreadyProcessed=true` y
    // no reprocesará. Si queremos forzar reintento de procesamiento limpio,
    // habría que borrar la fila explícitamente. Por ahora preferimos seguridad.
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
