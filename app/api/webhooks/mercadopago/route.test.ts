/**
 * Integration test del webhook de Mercado Pago.
 *
 * Mockea:
 *   - `@/lib/supabase/admin` con un fake en memoria que respeta unique(profile_id)
 *     y unique(request_id) en webhook_events.
 *   - `global.fetch` para responder con payloads de la API de MP.
 *
 * Cubre:
 *   - Firma inválida → 401, no se inserta nada.
 *   - Firma válida + payment approved + external_reference → entitlement
 *     queda con status='active' y current_period_end en futuro.
 *   - Mismo x-request-id dos veces → segundo POST es 200 y NO modifica el
 *     entitlement una segunda vez (idempotencia).
 */
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- Fake Supabase admin client ----------

type EntitlementRow = {
  profile_id: string;
  free_plan_used_at: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  payer_email: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type WebhookRow = {
  request_id: string;
  provider: string;
  event_type: string | null;
  payload: unknown;
  processed_at: string;
};

const entitlements = new Map<string, EntitlementRow>();
const webhookEvents = new Map<string, WebhookRow>();

function resetFakeDb() {
  entitlements.clear();
  webhookEvents.clear();
}

function defaultEntitlement(profileId: string): EntitlementRow {
  const now = new Date().toISOString();
  return {
    profile_id: profileId,
    free_plan_used_at: null,
    provider: null,
    provider_subscription_id: null,
    payer_email: null,
    status: null,
    current_period_end: null,
    created_at: now,
    updated_at: now
  };
}

function makeFakeAdmin() {
  const from = (table: string) => {
    type Filter = { col: string; op: 'eq'; value: string };
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'update' | null = null;
    let insertPayload: any = null;
    let updatePayload: any = null;

    const builder: any = {};

    builder.select = () => {
      if (mode === null) mode = 'select';
      return builder;
    };
    builder.eq = (col: string, value: string) => {
      filters.push({ col, op: 'eq', value });
      return builder;
    };
    builder.is = () => builder;
    builder.insert = (payload: any) => {
      mode = 'insert';
      insertPayload = payload;
      return builder;
    };
    builder.update = (payload: any) => {
      mode = 'update';
      updatePayload = payload;
      return builder;
    };

    function applyFilters(row: Record<string, any>): boolean {
      return filters.every((f) => row[f.col] === f.value);
    }

    function exec(): { data: any; error: any } {
      if (table === 'entitlements') {
        if (mode === 'insert' && insertPayload) {
          const profileId = insertPayload.profile_id as string;
          if (entitlements.has(profileId)) {
            return { data: null, error: { code: '23505', message: 'duplicate' } };
          }
          const row = { ...defaultEntitlement(profileId), ...insertPayload };
          entitlements.set(profileId, row);
          return { data: [row], error: null };
        }
        const allRows = Array.from(entitlements.values());
        if (mode === 'update' && updatePayload) {
          const matched: EntitlementRow[] = [];
          for (const row of allRows) {
            if (applyFilters(row)) {
              Object.assign(row, updatePayload, { updated_at: new Date().toISOString() });
              matched.push(row);
            }
          }
          return { data: matched, error: null };
        }
        const rows = allRows.filter(applyFilters);
        return { data: rows, error: null };
      }

      if (table === 'webhook_events') {
        if (mode === 'insert' && insertPayload) {
          if (webhookEvents.has(insertPayload.request_id)) {
            return { data: null, error: { code: '23505', message: 'duplicate' } };
          }
          const row: WebhookRow = {
            request_id: insertPayload.request_id,
            provider: insertPayload.provider,
            event_type: insertPayload.event_type ?? null,
            payload: insertPayload.payload,
            processed_at: new Date().toISOString()
          };
          webhookEvents.set(row.request_id, row);
          return { data: [row], error: null };
        }
      }

      return { data: [], error: null };
    }

    builder.maybeSingle = async () => {
      const result = exec();
      if (result.error) return { data: null, error: result.error };
      return { data: result.data?.[0] ?? null, error: null };
    };
    builder.single = async () => {
      const result = exec();
      if (result.error) return { data: null, error: result.error };
      if (!result.data || result.data.length === 0) {
        return { data: null, error: { message: 'no row' } };
      }
      return { data: result.data[0], error: null };
    };
    builder.then = (resolve: (r: any) => void) => {
      resolve(exec());
    };

    return builder;
  };

  return { from };
}

// ---------- Mock de los módulos ----------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => makeFakeAdmin()
}));

// ---------- Helpers de request ----------

const SECRET = 'unit-test-secret-key-min-32-chars-xxxxx';
const PROFILE_ID = '11111111-2222-3333-4444-555555555555';
const SUBSCRIPTION_ID = 'sub_test_42';

function buildSignedRequest(payload: any, requestId: string): Request {
  const dataId = payload.data?.id ?? '';
  const ts = '1700000000';
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');

  return new Request('http://localhost/api/webhooks/mercadopago', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': requestId
    },
    body: JSON.stringify(payload)
  });
}

// ---------- Tests ----------

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    resetFakeDb();
    vi.unstubAllEnvs();
    vi.stubEnv('MERCADO_PAGO_WEBHOOK_SECRET', SECRET);
    vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'test-mp-token');
    vi.unstubAllGlobals();
  });

  it('401 si la firma es inválida y no toca la DB', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/webhooks/mercadopago', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': 'ts=1700000000,v1=deadbeef',
        'x-request-id': 'req-bad'
      },
      body: JSON.stringify({ type: 'payment', data: { id: 'pay-1' } })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(webhookEvents.size).toBe(0);
    expect(entitlements.size).toBe(0);
  });

  it('payment.approved con external_reference actualiza el entitlement a active', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/v1/payments/')) {
          return new Response(
            JSON.stringify({
              id: 999,
              status: 'approved',
              preapproval_id: SUBSCRIPTION_ID,
              payer: { email: 'payer@test.com' },
              external_reference: PROFILE_ID
            }),
            { status: 200 }
          );
        }
        if (url.includes('/preapproval/')) {
          return new Response(
            JSON.stringify({
              id: SUBSCRIPTION_ID,
              status: 'authorized',
              external_reference: PROFILE_ID,
              payer_email: 'payer@test.com',
              next_payment_date: '2099-01-01T00:00:00Z'
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      })
    );

    const { POST } = await import('./route');
    const request = buildSignedRequest(
      {
        type: 'payment',
        action: 'payment.updated',
        data: { id: '999' }
      },
      'req-good-1'
    );
    const response = await POST(request);
    expect(response.status).toBe(200);

    const ent = entitlements.get(PROFILE_ID);
    expect(ent).toBeDefined();
    expect(ent?.status).toBe('active');
    expect(ent?.provider_subscription_id).toBe(SUBSCRIPTION_ID);
    expect(ent?.payer_email).toBe('payer@test.com');
    expect(ent?.current_period_end).toBe('2099-01-01T00:00:00Z');
  });

  it('mismo x-request-id dos veces no duplica trabajo (idempotencia)', async () => {
    let mpCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        mpCalls += 1;
        if (url.includes('/v1/payments/')) {
          return new Response(
            JSON.stringify({
              id: 1,
              status: 'approved',
              preapproval_id: SUBSCRIPTION_ID,
              payer: { email: 'p@x.com' },
              external_reference: PROFILE_ID
            }),
            { status: 200 }
          );
        }
        if (url.includes('/preapproval/')) {
          return new Response(
            JSON.stringify({
              id: SUBSCRIPTION_ID,
              status: 'authorized',
              external_reference: PROFILE_ID,
              next_payment_date: '2099-02-01T00:00:00Z'
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      })
    );

    const { POST } = await import('./route');
    const requestId = 'req-dedup-1';

    const first = await POST(
      buildSignedRequest(
        {
          type: 'payment',
          action: 'payment.created',
          data: { id: '1' }
        },
        requestId
      )
    );
    expect(first.status).toBe(200);
    const callsAfterFirst = mpCalls;
    const periodEndAfterFirst = entitlements.get(PROFILE_ID)?.current_period_end;

    // Mutamos el current_period_end después del primer hit — si el webhook
    // procesara la segunda llamada, lo sobreescribiría.
    const ent = entitlements.get(PROFILE_ID)!;
    ent.current_period_end = '1990-01-01T00:00:00Z';

    const second = await POST(
      buildSignedRequest(
        {
          type: 'payment',
          action: 'payment.created',
          data: { id: '1' }
        },
        requestId
      )
    );
    expect(second.status).toBe(200);
    const json = await second.json();
    expect(json.deduped).toBe(true);
    expect(mpCalls).toBe(callsAfterFirst);
    // No reprocesó — el valor que mutamos sigue intacto.
    expect(entitlements.get(PROFILE_ID)?.current_period_end).toBe(
      '1990-01-01T00:00:00Z'
    );
    expect(periodEndAfterFirst).toBe('2099-02-01T00:00:00Z');
  });
});
