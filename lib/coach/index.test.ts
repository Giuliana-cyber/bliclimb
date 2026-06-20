import { describe, expect, it, beforeEach } from 'vitest';
import {
  acceptInvite,
  canAddClient,
  COACH_TIER_LIMITS,
  getClientCoach,
  getCoachClientCount,
  getCoachClients,
  inviteClient,
  isCoach,
  removeClient,
  type CoachClient,
  type CoachClientsClient
} from './index';

// ---------- Fake Supabase multi-tabla ----------
//
// Soporta solo lo que estos helpers usan: profiles, coach_clients,
// entitlements; con select/insert/update + filtros eq y count exact head.

type ProfileRow = { id: string; role: 'athlete' | 'coach' | 'admin' };
type EntitlementRow = { profile_id: string; coach_max_clients: number | null };

type Tables = {
  profiles: ProfileRow[];
  coach_clients: CoachClient[];
  entitlements: EntitlementRow[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeCoachClientRow(overrides: Partial<CoachClient>): CoachClient {
  return {
    id: `cc_${Math.random().toString(36).slice(2)}`,
    coach_id: 'coach_x',
    client_id: null,
    invite_token: 'tok',
    invite_email: null,
    status: 'pending',
    accepted_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...overrides
  };
}

function createFakeClient(seed: Partial<Tables> = {}): {
  client: CoachClientsClient;
  tables: Tables;
} {
  const tables: Tables = {
    profiles: seed.profiles ?? [],
    coach_clients: seed.coach_clients ?? [],
    entitlements: seed.entitlements ?? []
  };

  const from = (table: keyof Tables) => {
    type Filter = { col: string; value: unknown };
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'update' | null = null;
    let insertPayload: any = null;
    let updatePayload: any = null;
    let countMode: 'exact' | null = null;
    let headOnly = false;
    let orderCol: { col: string; ascending: boolean } | null = null;

    const matches = (row: any) =>
      filters.every((f) => row[f.col] === f.value);

    const builder: any = {};

    builder.select = (_cols?: string, opts?: { count?: 'exact'; head?: boolean }) => {
      if (mode === null) mode = 'select';
      if (opts?.count === 'exact') countMode = 'exact';
      if (opts?.head) headOnly = true;
      return builder;
    };
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
    builder.eq = (col: string, value: unknown) => {
      filters.push({ col, value });
      return builder;
    };
    builder.order = (col: string, opts?: { ascending?: boolean }) => {
      orderCol = { col, ascending: opts?.ascending ?? true };
      return builder;
    };

    const execute = () => {
      const rows = tables[table] as any[];

      if (mode === 'insert') {
        const inserted = {
          ...insertPayload,
          id: insertPayload.id ?? `row_${rows.length + 1}`,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        rows.push(inserted);
        return { data: inserted, error: null, count: null };
      }

      if (mode === 'update') {
        let updated: any = null;
        for (const row of rows) {
          if (matches(row)) {
            Object.assign(row, updatePayload, { updated_at: nowIso() });
            updated = row;
          }
        }
        return { data: updated, error: null, count: null };
      }

      // select
      let result = rows.filter(matches);
      if (orderCol) {
        const { col, ascending } = orderCol;
        result = [...result].sort((a, b) => {
          const av = a[col] ?? '';
          const bv = b[col] ?? '';
          if (av === bv) return 0;
          const cmp = av > bv ? 1 : -1;
          return ascending ? cmp : -cmp;
        });
      }

      if (countMode === 'exact') {
        return { data: headOnly ? null : result, error: null, count: result.length };
      }
      return { data: result, error: null, count: null };
    };

    builder.maybeSingle = () => {
      const res = execute();
      if (!Array.isArray(res.data)) return Promise.resolve(res);
      const first = res.data[0] ?? null;
      return Promise.resolve({ data: first, error: null, count: null });
    };
    builder.single = () => {
      const res = execute();
      if (Array.isArray(res.data)) {
        const first = res.data[0];
        if (!first) {
          return Promise.resolve({ data: null, error: { message: 'no rows' }, count: null });
        }
        return Promise.resolve({ data: first, error: null, count: null });
      }
      return Promise.resolve(res);
    };
    builder.then = (resolve: any) => Promise.resolve(execute()).then(resolve);

    return builder;
  };

  return { client: { from } as unknown as CoachClientsClient, tables };
}

// ---------- Tests ----------

describe('COACH_TIER_LIMITS', () => {
  it('starter=5, pro=15, gym ilimitado-ish', () => {
    expect(COACH_TIER_LIMITS.starter).toBe(5);
    expect(COACH_TIER_LIMITS.pro).toBe(15);
    expect(COACH_TIER_LIMITS.gym).toBeGreaterThanOrEqual(100);
  });
});

describe('isCoach', () => {
  it('true si role=coach', async () => {
    const { client } = createFakeClient({
      profiles: [{ id: 'u1', role: 'coach' }]
    });
    expect(await isCoach('u1', client)).toBe(true);
  });
  it('true si role=admin', async () => {
    const { client } = createFakeClient({
      profiles: [{ id: 'u1', role: 'admin' }]
    });
    expect(await isCoach('u1', client)).toBe(true);
  });
  it('false si role=athlete', async () => {
    const { client } = createFakeClient({
      profiles: [{ id: 'u1', role: 'athlete' }]
    });
    expect(await isCoach('u1', client)).toBe(false);
  });
  it('false si el profile no existe', async () => {
    const { client } = createFakeClient();
    expect(await isCoach('ghost', client)).toBe(false);
  });
});

describe('canAddClient', () => {
  it('false si el coach no tiene tier asignado', async () => {
    const { client } = createFakeClient({
      entitlements: [{ profile_id: 'c1', coach_max_clients: null }]
    });
    expect(await canAddClient('c1', client)).toBe(false);
  });

  it('starter permite hasta 5 clientes', async () => {
    const accepted: CoachClient[] = Array.from({ length: 4 }).map((_, i) =>
      makeCoachClientRow({ coach_id: 'c1', client_id: `u${i}`, status: 'accepted' })
    );
    const { client } = createFakeClient({
      entitlements: [{ profile_id: 'c1', coach_max_clients: 5 }],
      coach_clients: accepted
    });
    expect(await canAddClient('c1', client)).toBe(true);
  });

  it('starter bloquea al llegar a 5', async () => {
    const accepted: CoachClient[] = Array.from({ length: 5 }).map((_, i) =>
      makeCoachClientRow({ coach_id: 'c1', client_id: `u${i}`, status: 'accepted' })
    );
    const { client } = createFakeClient({
      entitlements: [{ profile_id: 'c1', coach_max_clients: 5 }],
      coach_clients: accepted
    });
    expect(await canAddClient('c1', client)).toBe(false);
  });

  it('pendientes/removed no cuentan contra el cupo', async () => {
    const mixed: CoachClient[] = [
      ...Array.from({ length: 5 }).map((_, i) =>
        makeCoachClientRow({ coach_id: 'c1', client_id: `u${i}`, status: 'pending' })
      ),
      ...Array.from({ length: 3 }).map((_, i) =>
        makeCoachClientRow({ coach_id: 'c1', client_id: `r${i}`, status: 'removed' })
      )
    ];
    const { client } = createFakeClient({
      entitlements: [{ profile_id: 'c1', coach_max_clients: 5 }],
      coach_clients: mixed
    });
    expect(await canAddClient('c1', client)).toBe(true);
  });
});

describe('getCoachClientCount', () => {
  it('cuenta solo accepted', async () => {
    const rows: CoachClient[] = [
      makeCoachClientRow({ coach_id: 'c1', status: 'accepted', client_id: 'a' }),
      makeCoachClientRow({ coach_id: 'c1', status: 'accepted', client_id: 'b' }),
      makeCoachClientRow({ coach_id: 'c1', status: 'pending' }),
      makeCoachClientRow({ coach_id: 'c2', status: 'accepted', client_id: 'x' })
    ];
    const { client } = createFakeClient({ coach_clients: rows });
    expect(await getCoachClientCount('c1', client)).toBe(2);
  });
});

describe('getCoachClients', () => {
  it('devuelve solo accepted del coach', async () => {
    const rows: CoachClient[] = [
      makeCoachClientRow({ coach_id: 'c1', status: 'accepted', client_id: 'a' }),
      makeCoachClientRow({ coach_id: 'c1', status: 'pending', client_id: null }),
      makeCoachClientRow({ coach_id: 'c2', status: 'accepted', client_id: 'b' })
    ];
    const { client } = createFakeClient({ coach_clients: rows });
    const result = await getCoachClients('c1', client);
    expect(result).toHaveLength(1);
    expect(result[0].client_id).toBe('a');
  });
});

describe('inviteClient', () => {
  it('inserta pending con token + devuelve URL', async () => {
    const { client, tables } = createFakeClient();
    const result = await inviteClient(
      'c1',
      'alice@example.com',
      client,
      () => 'tok-abc'
    );
    expect(result.inviteToken).toBe('tok-abc');
    expect(result.inviteUrl).toContain('/invite/tok-abc');
    expect(tables.coach_clients).toHaveLength(1);
    expect(tables.coach_clients[0].status).toBe('pending');
    expect(tables.coach_clients[0].invite_email).toBe('alice@example.com');
  });
});

describe('acceptInvite', () => {
  it('marca como accepted y asigna client_id', async () => {
    const seed = makeCoachClientRow({
      id: 'cc1',
      coach_id: 'c1',
      invite_token: 'tok-1',
      status: 'pending'
    });
    const { client } = createFakeClient({ coach_clients: [seed] });
    const updated = await acceptInvite('u-new', 'tok-1', client);
    expect(updated.status).toBe('accepted');
    expect(updated.client_id).toBe('u-new');
    expect(updated.accepted_at).not.toBeNull();
  });

  it('falla si el token no existe', async () => {
    const { client } = createFakeClient();
    await expect(acceptInvite('u', 'no-existe', client)).rejects.toThrow(
      /no encontrada/i
    );
  });

  it('idempotente: aceptar dos veces el mismo cliente devuelve la fila', async () => {
    const seed = makeCoachClientRow({
      id: 'cc1',
      coach_id: 'c1',
      client_id: 'u-new',
      invite_token: 'tok-1',
      status: 'accepted',
      accepted_at: nowIso()
    });
    const { client } = createFakeClient({ coach_clients: [seed] });
    const result = await acceptInvite('u-new', 'tok-1', client);
    expect(result.status).toBe('accepted');
    expect(result.client_id).toBe('u-new');
  });

  it('rechaza si otro usuario ya aceptó la invitación', async () => {
    const seed = makeCoachClientRow({
      coach_id: 'c1',
      client_id: 'u-other',
      invite_token: 'tok-1',
      status: 'accepted'
    });
    const { client } = createFakeClient({ coach_clients: [seed] });
    await expect(acceptInvite('u-new', 'tok-1', client)).rejects.toThrow(
      /otro usuario/i
    );
  });

  it('rechaza si la invitación fue removida', async () => {
    const seed = makeCoachClientRow({ invite_token: 'tok-1', status: 'removed' });
    const { client } = createFakeClient({ coach_clients: [seed] });
    await expect(acceptInvite('u', 'tok-1', client)).rejects.toThrow(/no es válida/i);
  });
});

describe('removeClient', () => {
  it('marca status=removed para la relación accepted', async () => {
    const seed = makeCoachClientRow({
      coach_id: 'c1',
      client_id: 'u1',
      status: 'accepted'
    });
    const { client, tables } = createFakeClient({ coach_clients: [seed] });
    await removeClient('c1', 'u1', client);
    expect(tables.coach_clients[0].status).toBe('removed');
  });
});

describe('getClientCoach', () => {
  it('devuelve la relación accepted del cliente', async () => {
    const seed = makeCoachClientRow({
      coach_id: 'c1',
      client_id: 'u1',
      status: 'accepted'
    });
    const { client } = createFakeClient({ coach_clients: [seed] });
    const result = await getClientCoach('u1', client);
    expect(result?.coach_id).toBe('c1');
  });
  it('null si no tiene coach', async () => {
    const { client } = createFakeClient();
    expect(await getClientCoach('u1', client)).toBeNull();
  });
});
