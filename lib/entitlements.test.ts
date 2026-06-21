import { describe, expect, it, beforeEach } from 'vitest';
import {
  canGenerateFreePlan,
  canRegeneratePlan,
  findEntitlementByStripeCustomerId,
  findEntitlementBySubscriptionId,
  freePlanExpiresAt,
  getEntitlement,
  getPlanRegenStatus,
  hasActivePlanAccess,
  hasActiveSubscription,
  incrementPlanCount,
  isWithinFreePlanWindow,
  mapStripeStatus,
  markFreePlanUsed,
  markStripePastDue,
  markStripeSubscriptionCancelled,
  updateStripePeriodEnd,
  upsertEntitlementFromWebhook,
  upsertFromStripeSubscription,
  upsertStripeCustomer,
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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plans_generated_this_month: number;
  plan_month_reset_at: string | null;
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
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    plans_generated_this_month: 0,
    plan_month_reset_at: now,
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

describe('freePlanExpiresAt / isWithinFreePlanWindow / hasActivePlanAccess', () => {
  it('freePlanExpiresAt es null cuando no se generó plan', () => {
    const exp = freePlanExpiresAt({
      profile_id: USER_ID,
      free_plan_used_at: null,
      provider: null,
      provider_subscription_id: null,
      payer_email: null,
      status: null,
      current_period_end: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      plans_generated_this_month: 0,
      plan_month_reset_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    expect(exp).toBeNull();
  });

  it('freePlanExpiresAt suma 30 días al free_plan_used_at', () => {
    const usedAt = new Date('2026-01-01T12:00:00Z');
    const exp = freePlanExpiresAt({
      profile_id: USER_ID,
      free_plan_used_at: usedAt.toISOString(),
      provider: null,
      provider_subscription_id: null,
      payer_email: null,
      status: null,
      current_period_end: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      plans_generated_this_month: 0,
      plan_month_reset_at: null,
      created_at: usedAt.toISOString(),
      updated_at: usedAt.toISOString()
    });
    expect(exp).toBeInstanceOf(Date);
    expect(exp!.toISOString()).toBe('2026-01-31T12:00:00.000Z');
  });

  it('isWithinFreePlanWindow false si nunca usó plan', async () => {
    const client = createFakeClient();
    expect(await isWithinFreePlanWindow(USER_ID, client)).toBe(false);
  });

  it('isWithinFreePlanWindow true 5 días después del primer plan', async () => {
    const client = createFakeClient();
    await markFreePlanUsed(USER_ID, client);
    expect(await isWithinFreePlanWindow(USER_ID, client)).toBe(true);
  });

  it('isWithinFreePlanWindow false 31 días después del primer plan', async () => {
    const client = createFakeClient();
    await markFreePlanUsed(USER_ID, client);
    // Mutamos el timestamp para simular el paso del tiempo.
    const { data } = await (client as unknown as {
      from: (t: string) => {
        select: () => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { free_plan_used_at: string } | null }> } };
      };
    })
      .from('entitlements')
      .select()
      .eq('profile_id', USER_ID)
      .maybeSingle();
    if (data) {
      const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      (data as { free_plan_used_at: string }).free_plan_used_at = stale;
    }
    expect(await isWithinFreePlanWindow(USER_ID, client)).toBe(false);
  });

  it('hasActivePlanAccess true con suscripción activa aunque no haya usado plan gratis', async () => {
    const client = createFakeClient();
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    await upsertEntitlementFromWebhook(
      {
        profile_id: USER_ID,
        provider_subscription_id: 'sub_x',
        payer_email: null,
        status: 'active',
        current_period_end: future
      },
      client
    );
    expect(await hasActivePlanAccess(USER_ID, client)).toBe(true);
  });

  it('hasActivePlanAccess true durante mes gratis sin suscripción', async () => {
    const client = createFakeClient();
    await markFreePlanUsed(USER_ID, client);
    expect(await hasActivePlanAccess(USER_ID, client)).toBe(true);
  });

  it('hasActivePlanAccess false sin plan generado y sin suscripción', async () => {
    const client = createFakeClient();
    expect(await hasActivePlanAccess(USER_ID, client)).toBe(false);
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

// ---------- Stripe helpers ----------

describe('mapStripeStatus', () => {
  it('active y trialing → active', () => {
    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('trialing')).toBe('active');
  });
  it('canceled → cancelled', () => {
    expect(mapStripeStatus('canceled')).toBe('cancelled');
  });
  it('past_due y unpaid → past_due', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('unpaid')).toBe('past_due');
  });
  it('paused → paused', () => {
    expect(mapStripeStatus('paused')).toBe('paused');
  });
  it('incomplete y incomplete_expired → pending', () => {
    expect(mapStripeStatus('incomplete')).toBe('pending');
    expect(mapStripeStatus('incomplete_expired')).toBe('pending');
  });
  it('estatus desconocido → null', () => {
    expect(mapStripeStatus('whatever')).toBeNull();
  });
});

describe('upsertStripeCustomer', () => {
  it('escribe stripe_customer_id por primera vez', async () => {
    const client = createFakeClient();
    await upsertStripeCustomer(USER_ID, 'cus_test', client);
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.stripe_customer_id).toBe('cus_test');
    expect(ent.provider).toBe('stripe');
  });

  it('es idempotente', async () => {
    const client = createFakeClient();
    await upsertStripeCustomer(USER_ID, 'cus_test', client);
    await upsertStripeCustomer(USER_ID, 'cus_test', client);
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.stripe_customer_id).toBe('cus_test');
  });
});

describe('upsertFromStripeSubscription', () => {
  it('mapea trialing → active y guarda period_end', async () => {
    const client = createFakeClient();
    const trialEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    const result = await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_T',
        status: 'trialing',
        current_period_end: trialEnd,
        customer: 'cus_T',
        items: { data: [{ price: { id: 'price_X' } }] }
      },
      client
    );
    expect(result.status).toBe('active');
    expect(result.stripe_subscription_id).toBe('sub_T');
    expect(result.stripe_customer_id).toBe('cus_T');
    expect(result.stripe_price_id).toBe('price_X');
    expect(result.current_period_end).toBeTypeOf('string');
  });

  it('mapea active → active', async () => {
    const client = createFakeClient();
    const periodEnd = Math.floor(Date.now() / 1000) + 365 * 86400;
    const result = await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_A',
        status: 'active',
        current_period_end: periodEnd,
        customer: { id: 'cus_A' }
      },
      client
    );
    expect(result.status).toBe('active');
    expect(result.stripe_customer_id).toBe('cus_A');
  });

  it('mapea canceled → cancelled preservando period_end', async () => {
    const client = createFakeClient();
    const futureEnd = Math.floor(Date.now() / 1000) + 86400;
    const result = await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_C',
        status: 'canceled',
        current_period_end: futureEnd,
        customer: 'cus_C'
      },
      client
    );
    expect(result.status).toBe('cancelled');
    expect(result.current_period_end).toBeTypeOf('string');
  });

  it('mapea past_due', async () => {
    const client = createFakeClient();
    const result = await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_PD',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        customer: 'cus_PD'
      },
      client
    );
    expect(result.status).toBe('past_due');
  });

  it('lanza si el status no es mapeable', async () => {
    const client = createFakeClient();
    await expect(
      upsertFromStripeSubscription(
        USER_ID,
        { id: 'sub_X', status: 'mystery_status', customer: 'cus_X' },
        client
      )
    ).rejects.toThrow(/no mapeable/);
  });
});

describe('markStripeSubscriptionCancelled / updateStripePeriodEnd / markStripePastDue', () => {
  it('markStripeSubscriptionCancelled pone status cancelled sin tocar period_end', async () => {
    const client = createFakeClient();
    const futureEnd = Math.floor(Date.now() / 1000) + 86400;
    await upsertFromStripeSubscription(
      USER_ID,
      { id: 'sub_M', status: 'active', current_period_end: futureEnd, customer: 'cus_M' },
      client
    );
    const before = await getEntitlement(USER_ID, client);
    await markStripeSubscriptionCancelled('sub_M', client);
    const after = await getEntitlement(USER_ID, client);
    expect(after.status).toBe('cancelled');
    expect(after.current_period_end).toBe(before.current_period_end);
  });

  it('updateStripePeriodEnd actualiza la fecha y vuelve a active', async () => {
    const client = createFakeClient();
    await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_R',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000),
        customer: 'cus_R'
      },
      client
    );
    const nextPeriod = Math.floor(Date.now() / 1000) + 365 * 86400;
    await updateStripePeriodEnd('sub_R', nextPeriod, client);
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.status).toBe('active');
    expect(ent.current_period_end).toBe(new Date(nextPeriod * 1000).toISOString());
  });

  it('markStripePastDue pone status past_due', async () => {
    const client = createFakeClient();
    await upsertFromStripeSubscription(
      USER_ID,
      {
        id: 'sub_F',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        customer: 'cus_F'
      },
      client
    );
    await markStripePastDue('sub_F', client);
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.status).toBe('past_due');
  });
});

describe('findEntitlementByStripeCustomerId', () => {
  it('null cuando no existe', async () => {
    const client = createFakeClient();
    expect(await findEntitlementByStripeCustomerId('cus_nope', client)).toBeNull();
  });

  it('encuentra la fila por stripe_customer_id', async () => {
    const client = createFakeClient();
    await upsertStripeCustomer(USER_ID, 'cus_found', client);
    const found = await findEntitlementByStripeCustomerId('cus_found', client);
    expect(found?.profile_id).toBe(USER_ID);
  });
});

describe('canRegeneratePlan + incrementPlanCount', () => {
  it('true cuando el contador es 0', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client); // crea la fila
    expect(await canRegeneratePlan(USER_ID, client)).toBe(true);
  });

  it('true cuando el contador es 1', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    await incrementPlanCount(USER_ID, client);
    expect(await canRegeneratePlan(USER_ID, client)).toBe(true);
  });

  it('false cuando el contador llega a 2', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    await incrementPlanCount(USER_ID, client);
    await incrementPlanCount(USER_ID, client);
    expect(await canRegeneratePlan(USER_ID, client)).toBe(false);
  });

  it('incrementa el contador en 1 por llamada', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    await incrementPlanCount(USER_ID, client);
    const ent1 = await getEntitlement(USER_ID, client);
    expect(ent1.plans_generated_this_month).toBe(1);
    await incrementPlanCount(USER_ID, client);
    const ent2 = await getEntitlement(USER_ID, client);
    expect(ent2.plans_generated_this_month).toBe(2);
  });

  it('resetea contador a 0 cuando plan_month_reset_at es de un mes anterior', async () => {
    const client = createFakeClient();
    // Forzar fila con reset_at en el mes anterior + contador maxed.
    await getEntitlement(USER_ID, client);
    const now = new Date(Date.UTC(2026, 6, 15)); // 15 julio 2026
    const prevMonth = new Date(Date.UTC(2026, 5, 10)).toISOString(); // 10 junio 2026
    await client
      .from('entitlements')
      .update({ plans_generated_this_month: 2, plan_month_reset_at: prevMonth })
      .eq('profile_id', USER_ID);

    const allowed = await canRegeneratePlan(USER_ID, client, now);
    expect(allowed).toBe(true);

    // La fila quedó reseteada y se puede leer.
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.plans_generated_this_month).toBe(0);
    expect(ent.plan_month_reset_at).toBe(now.toISOString());
  });

  it('no resetea si plan_month_reset_at es del mismo mes', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    const now = new Date(Date.UTC(2026, 6, 28));
    const sameMonth = new Date(Date.UTC(2026, 6, 1)).toISOString();
    await client
      .from('entitlements')
      .update({ plans_generated_this_month: 2, plan_month_reset_at: sameMonth })
      .eq('profile_id', USER_ID);

    expect(await canRegeneratePlan(USER_ID, client, now)).toBe(false);
    const ent = await getEntitlement(USER_ID, client);
    expect(ent.plans_generated_this_month).toBe(2);
  });
});

describe('getPlanRegenStatus', () => {
  it('reporta count actual + resetAt = primer día del mes siguiente', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    const now = new Date(Date.UTC(2026, 6, 15));
    // Anclamos el reset al mes actual del test para que count no se "expire".
    await client
      .from('entitlements')
      .update({
        plans_generated_this_month: 1,
        plan_month_reset_at: new Date(Date.UTC(2026, 6, 1)).toISOString()
      })
      .eq('profile_id', USER_ID);

    const status = await getPlanRegenStatus(USER_ID, client, now);
    expect(status.count).toBe(1);
    expect(status.max).toBe(2);
    // Primer día de agosto 2026 UTC
    expect(status.resetAt).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
  });

  it('reporta count=0 cuando ya pasó el mes (lectura sin escribir)', async () => {
    const client = createFakeClient();
    await getEntitlement(USER_ID, client);
    const prevMonth = new Date(Date.UTC(2026, 5, 10)).toISOString();
    await client
      .from('entitlements')
      .update({ plans_generated_this_month: 2, plan_month_reset_at: prevMonth })
      .eq('profile_id', USER_ID);

    const now = new Date(Date.UTC(2026, 6, 15));
    const status = await getPlanRegenStatus(USER_ID, client, now);
    expect(status.count).toBe(0);
  });
});
