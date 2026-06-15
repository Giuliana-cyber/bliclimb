import { describe, expect, it, beforeEach } from 'vitest';
import {
  canGenerateFreePlan,
  findEntitlementBySubscriptionId,
  getEntitlement,
  hasActiveSubscription,
  markFreePlanUsed,
  upsertEntitlementFromWebhook,
  type EntitlementsClient
} from './entitlements';

// ---------- Fake Supabase client en memoria ----------

type Row = {
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

function makeRow(profileId: string): Row {
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

function createFakeClient(): EntitlementsClient {
  const rows: Row[] = [];

  // Builder estilo Supabase: from(table).select|insert|update|...
  const from = (table: string) => {
    if (table !== 'entitlements') {
      throw new Error(`Tabla inesperada: ${table}`);
    }

    type Filter = { col: string; op: 'eq' | 'is_null'; value?: string };
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'update' | null = null;
    let insertPayload: Partial<Row> | null = null;
    let updatePayload: Partial<Row> | null = null;

    const builder: any = {};

    builder.select = (_cols?: string) => {
      if (mode === null) mode = 'select';
      return builder;
    };

    builder.eq = (col: string, value: string) => {
      filters.push({ col, op: 'eq', value });
      return builder;
    };

    builder.is = (col: string, value: null) => {
      filters.push({ col, op: 'is_null', value: value === null ? 'null' : 'notnull' });
      return builder;
    };

    builder.insert = (payload: Partial<Row>) => {
      mode = 'insert';
      insertPayload = payload;
      return builder;
    };

    builder.update = (payload: Partial<Row>) => {
      mode = 'update';
      updatePayload = payload;
      return builder;
    };

    function applyFilters(row: Row): boolean {
      for (const f of filters) {
        const value = (row as any)[f.col];
        if (f.op === 'eq' && value !== f.value) return false;
        if (f.op === 'is_null' && value !== null) return false;
      }
      return true;
    }

    function exec(): { data: Row[]; error: null } | { data: null; error: { message: string } } {
      if (mode === 'select' || mode === null) {
        return { data: rows.filter(applyFilters), error: null };
      }
      if (mode === 'insert' && insertPayload) {
        const newRow = { ...makeRow(insertPayload.profile_id as string), ...insertPayload };
        rows.push(newRow);
        return { data: [newRow], error: null };
      }
      if (mode === 'update' && updatePayload) {
        const matched: Row[] = [];
        for (const row of rows) {
          if (applyFilters(row)) {
            Object.assign(row, updatePayload, { updated_at: new Date().toISOString() });
            matched.push(row);
          }
        }
        return { data: matched, error: null };
      }
      return { data: [], error: null };
    }

    builder.maybeSingle = async () => {
      const result = exec();
      if (result.error || !result.data) return { data: null, error: result.error };
      return { data: result.data[0] ?? null, error: null };
    };

    builder.single = async () => {
      const result = exec();
      if (result.error || !result.data) return { data: null, error: result.error };
      if (result.data.length === 0) {
        return { data: null, error: { message: 'no row' } };
      }
      return { data: result.data[0], error: null };
    };

    // Promesa thenable para soportar `await client.from(...).update(...)` sin chain final
    builder.then = (resolve: (r: any) => void) => {
      const result = exec();
      resolve(result);
    };

    return builder;
  };

  return { from } as unknown as EntitlementsClient;
}

// ---------- Tests ----------

const USER_ID = '11111111-2222-3333-4444-555555555555';

describe('getEntitlement', () => {
  it('crea una fila vacía cuando el usuario no tiene entitlement', async () => {
    const client = createFakeClient();
    const result = await getEntitlement(USER_ID, client);
    expect(result.profile_id).toBe(USER_ID);
    expect(result.free_plan_used_at).toBeNull();
    expect(result.status).toBeNull();
  });

  it('devuelve la fila existente sin duplicar', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    const second = await getEntitlement(USER_ID, client);
    expect(second.profile_id).toBe(USER_ID);
  });
});

describe('canGenerateFreePlan', () => {
  it('true cuando el usuario nunca generó un plan', async () => {
    const client = createFakeClient();
    expect(await canGenerateFreePlan(USER_ID, client)).toBe(true);
  });

  it('false después de marcar el plan gratis como usado', async () => {
    const client = createFakeClient();
    await markFreePlanUsed(USER_ID, client);
    expect(await canGenerateFreePlan(USER_ID, client)).toBe(false);
  });
});

describe('markFreePlanUsed', () => {
  it('setea free_plan_used_at la primera vez', async () => {
    const client = createFakeClient();
    const result = await markFreePlanUsed(USER_ID, client);
    expect(result.free_plan_used_at).not.toBeNull();
  });

  it('es idempotente — no sobrescribe un timestamp existente', async () => {
    const client = createFakeClient();
    const first = await markFreePlanUsed(USER_ID, client);
    // pequeño delay para forzar diferencias de timestamp si la función sobrescribiera
    await new Promise((r) => setTimeout(r, 10));
    const second = await markFreePlanUsed(USER_ID, client);
    expect(second.free_plan_used_at).toBe(first.free_plan_used_at);
  });
});

describe('hasActiveSubscription', () => {
  it('false cuando no hay current_period_end', async () => {
    const client = createFakeClient();
    expect(await hasActiveSubscription(USER_ID, client)).toBe(false);
  });

  it('true con status active y período vigente', async () => {
    const client = createFakeClient();
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_1',
        payer_email: 'x@y.com',
        status: 'active',
        current_period_end: future
      },
      client
    );
    expect(await hasActiveSubscription(USER_ID, client)).toBe(true);
  });

  it('false con status active pero período vencido', async () => {
    const client = createFakeClient();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_1',
        payer_email: null,
        status: 'active',
        current_period_end: past
      },
      client
    );
    expect(await hasActiveSubscription(USER_ID, client)).toBe(false);
  });

  it('true con cancelled pero período aún vigente (cubrir el remanente pagado)', async () => {
    const client = createFakeClient();
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_1',
        payer_email: null,
        status: 'cancelled',
        current_period_end: future
      },
      client
    );
    expect(await hasActiveSubscription(USER_ID, client)).toBe(true);
  });

  it('false con paused', async () => {
    const client = createFakeClient();
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_1',
        payer_email: null,
        status: 'paused',
        current_period_end: future
      },
      client
    );
    expect(await hasActiveSubscription(USER_ID, client)).toBe(false);
  });
});

describe('findEntitlementBySubscriptionId', () => {
  it('null cuando no existe', async () => {
    const client = createFakeClient();
    expect(await findEntitlementBySubscriptionId('sub_x', client)).toBeNull();
  });

  it('encuentra la fila por (provider, provider_subscription_id)', async () => {
    const client = createFakeClient();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_42',
        payer_email: null,
        status: 'active',
        current_period_end: new Date(Date.now() + 86_400_000).toISOString()
      },
      client
    );
    const found = await findEntitlementBySubscriptionId('sub_42', client);
    expect(found?.profile_id).toBe(USER_ID);
  });
});
