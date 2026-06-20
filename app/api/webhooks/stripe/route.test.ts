/**
 * Tests del webhook de Stripe — firma, idempotencia, evento happy path.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- Fake DB ----------

type EventRow = { request_id: string; provider: string; event_type: string };
const webhookEvents = new Map<string, EventRow>();
type EntitlementRow = {
  profile_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  provider: string | null;
  status: string | null;
  current_period_end: string | null;
  free_plan_used_at: string | null;
  provider_subscription_id: string | null;
  payer_email: string | null;
  created_at: string;
  updated_at: string;
};
const entitlements = new Map<string, EntitlementRow>();

function resetDb() {
  webhookEvents.clear();
  entitlements.clear();
}

function defaultRow(id: string): EntitlementRow {
  const now = new Date().toISOString();
  return {
    profile_id: id,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    provider: null,
    status: null,
    current_period_end: null,
    free_plan_used_at: null,
    provider_subscription_id: null,
    payer_email: null,
    created_at: now,
    updated_at: now
  };
}

function buildBuilder(table: string) {
  type Filter = { col: string; value: string };
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
    filters.push({ col, value });
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
  function filterFn(row: any): boolean {
    return filters.every((f) => row[f.col] === f.value);
  }
  function exec(): { data: any; error: any } {
    if (table === 'webhook_events') {
      if (mode === 'insert' && insertPayload) {
        if (webhookEvents.has(insertPayload.request_id)) {
          return { data: null, error: { code: '23505' } };
        }
        webhookEvents.set(insertPayload.request_id, {
          request_id: insertPayload.request_id,
          provider: insertPayload.provider,
          event_type: insertPayload.event_type
        });
        return { data: [insertPayload], error: null };
      }
    }
    if (table === 'entitlements') {
      if (mode === 'insert' && insertPayload) {
        const id = insertPayload.profile_id as string;
        if (entitlements.has(id)) return { data: null, error: { code: '23505' } };
        const row = { ...defaultRow(id), ...insertPayload };
        entitlements.set(id, row);
        return { data: [row], error: null };
      }
      if (mode === 'update' && updatePayload) {
        const matched: EntitlementRow[] = [];
        for (const row of Array.from(entitlements.values())) {
          if (filterFn(row)) {
            Object.assign(row, updatePayload, { updated_at: new Date().toISOString() });
            matched.push(row);
          }
        }
        return { data: matched, error: null };
      }
      return {
        data: Array.from(entitlements.values()).filter(filterFn),
        error: null
      };
    }
    return { data: [], error: null };
  }
  builder.maybeSingle = async () => {
    const r = exec();
    return { data: r.data?.[0] ?? null, error: r.error };
  };
  builder.single = async () => {
    const r = exec();
    if (!r.data || r.data.length === 0) return { data: null, error: { message: 'no row' } };
    return { data: r.data[0], error: r.error };
  };
  builder.then = (resolve: (r: any) => void) => resolve(exec());
  return builder;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: buildBuilder })
}));

// ---------- Stripe stub ----------

const stripeStub = {
  webhooks: {
    constructEvent: vi.fn()
  },
  customers: {
    retrieve: vi.fn()
  }
};

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => stripeStub,
  getStripeWebhookSecret: () => 'whsec_test',
  // Los tests existentes solo cubren flujos de atleta — coachTier siempre null.
  coachTierFromPriceId: () => null
}));

vi.mock('@/lib/coach', () => ({
  applyCoachSubscription: vi.fn(),
  clearCoachSubscription: vi.fn()
}));

// ---------- Tests ----------

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    resetDb();
    stripeStub.webhooks.constructEvent.mockReset();
    stripeStub.customers.retrieve.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
  });

  it('401 cuando falta la firma', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: '{}'
      })
    );
    expect(response.status).toBe(401);
  });

  it('401 cuando constructEvent lanza por firma inválida', async () => {
    stripeStub.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad' },
        body: '{}'
      })
    );
    expect(response.status).toBe(401);
    expect(webhookEvents.size).toBe(0);
  });

  it('customer.subscription.updated escribe entitlement como active', async () => {
    const subscription = {
      id: 'sub_T',
      status: 'trialing',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      customer: 'cus_T',
      metadata: { supabase_user_id: 'user-1' },
      items: { data: [{ price: { id: 'price_X' } }] }
    };
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: subscription }
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}'
      })
    );
    expect(response.status).toBe(200);

    const row = entitlements.get('user-1');
    expect(row?.status).toBe('active');
    expect(row?.stripe_subscription_id).toBe('sub_T');
    expect(row?.stripe_customer_id).toBe('cus_T');
    expect(row?.stripe_price_id).toBe('price_X');
  });

  it('evento duplicado (mismo event.id) no reprocesa', async () => {
    const subscription = {
      id: 'sub_D',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      customer: 'cus_D',
      metadata: { supabase_user_id: 'user-2' }
    };
    stripeStub.webhooks.constructEvent.mockReturnValue({
      id: 'evt_dup',
      type: 'customer.subscription.updated',
      data: { object: subscription }
    });

    const { POST } = await import('./route');
    const reqInit = {
      method: 'POST' as const,
      headers: { 'stripe-signature': 'sig' },
      body: '{}'
    };
    const first = await POST(new Request('http://localhost/api/webhooks/stripe', reqInit));
    expect(first.status).toBe(200);
    expect(webhookEvents.size).toBe(1);

    // Mutamos el row para detectar si la segunda pasada lo sobreescribiría.
    const row = entitlements.get('user-2')!;
    row.current_period_end = '1990-01-01T00:00:00Z';

    const second = await POST(new Request('http://localhost/api/webhooks/stripe', reqInit));
    expect(second.status).toBe(200);
    const json = await second.json();
    expect(json.deduped).toBe(true);
    expect(entitlements.get('user-2')?.current_period_end).toBe('1990-01-01T00:00:00Z');
  });

  it('customer.subscription.deleted marca cancelled preservando period_end', async () => {
    // Seed: un entitlement con sub activa
    entitlements.set('user-3', {
      ...defaultRow('user-3'),
      stripe_customer_id: 'cus_3',
      stripe_subscription_id: 'sub_3',
      status: 'active',
      current_period_end: '2099-01-01T00:00:00Z'
    });

    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_del',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_3',
          status: 'canceled',
          customer: 'cus_3'
        }
      }
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}'
      })
    );
    expect(response.status).toBe(200);
    const row = entitlements.get('user-3');
    expect(row?.status).toBe('cancelled');
    expect(row?.current_period_end).toBe('2099-01-01T00:00:00Z');
  });

  it('invoice.payment_failed marca past_due', async () => {
    entitlements.set('user-4', {
      ...defaultRow('user-4'),
      stripe_customer_id: 'cus_4',
      stripe_subscription_id: 'sub_4',
      status: 'active',
      current_period_end: '2099-01-01T00:00:00Z'
    });
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_fail',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_1',
          subscription: 'sub_4',
          customer: 'cus_4'
        }
      }
    });
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}'
      })
    );
    expect(response.status).toBe(200);
    expect(entitlements.get('user-4')?.status).toBe('past_due');
  });
});
