/**
 * Tests del endpoint de checkout con Stripe.
 * Mockeamos Supabase auth, el admin client, y el SDK de Stripe.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type EntitlementsRow = {
  profile_id: string;
  stripe_customer_id: string | null;
  provider: string | null;
  free_plan_used_at: string | null;
  provider_subscription_id: string | null;
  payer_email: string | null;
  status: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
};

const entitlements = new Map<string, EntitlementsRow>();

function resetDb() {
  entitlements.clear();
}

let authedUser: { id: string; email?: string } | null = null;

function freshRow(id: string): EntitlementsRow {
  const now = new Date().toISOString();
  return {
    profile_id: id,
    stripe_customer_id: null,
    provider: null,
    free_plan_used_at: null,
    provider_subscription_id: null,
    payer_email: null,
    status: null,
    current_period_end: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    created_at: now,
    updated_at: now
  };
}

function buildBuilder(table: string) {
  if (table !== 'entitlements') throw new Error(`tabla inesperada: ${table}`);
  type Filter = { col: string; value: string };
  const filters: Filter[] = [];
  let mode: 'select' | 'insert' | 'update' | null = null;
  let insertPayload: Partial<EntitlementsRow> | null = null;
  let updatePayload: Partial<EntitlementsRow> | null = null;
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
  builder.insert = (payload: Partial<EntitlementsRow>) => {
    mode = 'insert';
    insertPayload = payload;
    return builder;
  };
  builder.update = (payload: Partial<EntitlementsRow>) => {
    mode = 'update';
    updatePayload = payload;
    return builder;
  };
  function applyFilters(row: EntitlementsRow): boolean {
    return filters.every((f) => (row as any)[f.col] === f.value);
  }
  function exec(): { data: EntitlementsRow[]; error: any } {
    if (mode === 'insert' && insertPayload) {
      const profileId = insertPayload.profile_id as string;
      if (entitlements.has(profileId)) {
        return { data: [], error: { code: '23505' } };
      }
      const row = { ...freshRow(profileId), ...insertPayload };
      entitlements.set(profileId, row);
      return { data: [row], error: null };
    }
    if (mode === 'update' && updatePayload) {
      const matched: EntitlementsRow[] = [];
      for (const row of Array.from(entitlements.values())) {
        if (applyFilters(row)) {
          Object.assign(row, updatePayload, { updated_at: new Date().toISOString() });
          matched.push(row);
        }
      }
      return { data: matched, error: null };
    }
    return {
      data: Array.from(entitlements.values()).filter(applyFilters),
      error: null
    };
  }
  builder.maybeSingle = async () => {
    const result = exec();
    return { data: result.data[0] ?? null, error: result.error };
  };
  builder.single = async () => {
    const result = exec();
    if (result.data.length === 0) return { data: null, error: { message: 'no row' } };
    return { data: result.data[0], error: result.error };
  };
  builder.then = (resolve: (r: any) => void) => resolve(exec());
  return builder;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: buildBuilder })
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: authedUser } })
    }
  })
}));

// Stripe stub controlable
const stripeCalls = {
  customersCreate: vi.fn(),
  sessionsCreate: vi.fn()
};

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({
    customers: {
      create: stripeCalls.customersCreate
    },
    checkout: {
      sessions: {
        create: stripeCalls.sessionsCreate
      }
    }
  }),
  getStripePriceId: (cycle: 'monthly' | 'annual' = 'annual') =>
    cycle === 'monthly' ? 'price_test_monthly' : 'price_test_annual'
}));

// ---------- Tests ----------

describe('POST /api/billing/create-checkout-session', () => {
  beforeEach(() => {
    resetDb();
    authedUser = null;
    stripeCalls.customersCreate.mockReset();
    stripeCalls.sessionsCreate.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test');
  });

  it('401 cuando no hay sesión', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com' })
      })
    );
    expect(response.status).toBe(401);
  });

  it('400 cuando el email es inválido', async () => {
    authedUser = { id: 'user-1' };
    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' })
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('invalid_payload');
  });

  it('crea customer + session y devuelve checkoutUrl', async () => {
    authedUser = { id: 'user-1' };
    stripeCalls.customersCreate.mockResolvedValueOnce({ id: 'cus_NEW' });
    stripeCalls.sessionsCreate.mockResolvedValueOnce({
      id: 'cs_TEST',
      url: 'https://checkout.stripe.com/c/abc'
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'pay@user.com' })
      })
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.checkoutUrl).toBe('https://checkout.stripe.com/c/abc');

    expect(stripeCalls.customersCreate).toHaveBeenCalledWith({
      email: 'pay@user.com',
      metadata: { supabase_user_id: 'user-1' }
    });

    const sessionArgs = stripeCalls.sessionsCreate.mock.calls[0][0];
    expect(sessionArgs.customer).toBe('cus_NEW');
    expect(sessionArgs.mode).toBe('subscription');
    // default es annual cuando no se pasa billingCycle
    expect(sessionArgs.line_items).toEqual([{ price: 'price_test_annual', quantity: 1 }]);
    expect(sessionArgs.success_url).toContain('https://app.test/billing/success');
    expect(sessionArgs.cancel_url).toBe('https://app.test/subscribe');
    expect(sessionArgs.metadata).toEqual({
      supabase_user_id: 'user-1',
      billing_cycle: 'annual'
    });
    expect(sessionArgs.subscription_data.metadata).toEqual({
      supabase_user_id: 'user-1'
    });

    // entitlement quedó con stripe_customer_id
    const row = entitlements.get('user-1');
    expect(row?.stripe_customer_id).toBe('cus_NEW');
    expect(row?.provider).toBe('stripe');
  });

  it('reutiliza el stripe_customer_id si ya existía', async () => {
    authedUser = { id: 'user-2' };
    entitlements.set('user-2', { ...freshRow('user-2'), stripe_customer_id: 'cus_OLD' });
    stripeCalls.sessionsCreate.mockResolvedValueOnce({
      id: 'cs_X',
      url: 'https://checkout.stripe.com/c/x'
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'pay@user.com' })
      })
    );
    expect(response.status).toBe(200);
    expect(stripeCalls.customersCreate).not.toHaveBeenCalled();
    expect(stripeCalls.sessionsCreate.mock.calls[0][0].customer).toBe('cus_OLD');
  });

  it('billingCycle="monthly" usa el price mensual', async () => {
    authedUser = { id: 'user-m' };
    stripeCalls.customersCreate.mockResolvedValueOnce({ id: 'cus_M' });
    stripeCalls.sessionsCreate.mockResolvedValueOnce({
      id: 'cs_M',
      url: 'https://checkout.stripe.com/c/m'
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'pay@user.com', billingCycle: 'monthly' })
      })
    );
    expect(response.status).toBe(200);
    const sessionArgs = stripeCalls.sessionsCreate.mock.calls[0][0];
    expect(sessionArgs.line_items).toEqual([{ price: 'price_test_monthly', quantity: 1 }]);
    expect(sessionArgs.metadata.billing_cycle).toBe('monthly');
  });

  it('billingCycle inválido → 400 invalid_payload', async () => {
    authedUser = { id: 'user-bad' };
    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'pay@user.com', billingCycle: 'weekly' })
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('invalid_payload');
  });

  it('502 cuando Stripe rechaza el create session', async () => {
    authedUser = { id: 'user-3' };
    stripeCalls.customersCreate.mockResolvedValueOnce({ id: 'cus_3' });
    stripeCalls.sessionsCreate.mockRejectedValueOnce(new Error('price_no_active'));

    const { POST } = await import('./route');
    const response = await POST(
      new Request('https://app.test/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'pay@user.com' })
      })
    );
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toBe('payment_provider_error');
    expect(json.detail).toBe('price_no_active');
  });
});
