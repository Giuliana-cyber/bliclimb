import { describe, expect, it } from 'vitest';
import {
  checkStreakMilestone,
  recordDailyActivity,
  streakFromDates,
  type StreaksClient
} from './index';

// ---------- Fake Supabase multi-tabla mínimo ----------

type ProfileRow = {
  id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
};

type ActivityRow = {
  profile_id: string;
  activity_date: string;
  type: string;
  session_id: string | null;
};

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function offsetDate(daysAgo: number, base: Date): string {
  return toDateKey(new Date(base.getTime() - daysAgo * 86_400_000));
}

function createFakeClient(seed: { profiles?: ProfileRow[]; activities?: ActivityRow[] } = {}): {
  client: StreaksClient;
  tables: { profiles: ProfileRow[]; activities: ActivityRow[] };
} {
  const tables = {
    profiles: seed.profiles ?? [],
    activities: seed.activities ?? []
  };

  const from = (table: string) => {
    const filters: Array<{ col: string; op: string; value: unknown }> = [];
    let mode: 'select' | 'insert' | 'update' | null = null;
    let insertPayload: any = null;
    let updatePayload: any = null;
    let orderCol: { col: string; asc: boolean } | null = null;

    const builder: any = {};
    builder.select = (_c?: string) => {
      if (mode === null) mode = 'select';
      return builder;
    };
    builder.eq = (col: string, value: unknown) => {
      filters.push({ col, op: 'eq', value });
      return builder;
    };
    builder.gte = (col: string, value: unknown) => {
      filters.push({ col, op: 'gte', value });
      return builder;
    };
    builder.order = (col: string, opts?: { ascending?: boolean }) => {
      orderCol = { col, asc: opts?.ascending ?? true };
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

    const matches = (row: any) =>
      filters.every((f) => {
        const v = row[f.col];
        if (f.op === 'eq') return v === f.value;
        if (f.op === 'gte') return v >= (f.value as string);
        return true;
      });

    const exec = () => {
      const rows = (tables as any)[table === 'profiles' ? 'profiles' : 'activities'] as any[];

      if (mode === 'insert') {
        // Detectar duplicado por unique (profile_id, activity_date) para
        // daily_activity.
        if (table === 'daily_activity') {
          const dup = rows.find(
            (r) =>
              r.profile_id === insertPayload.profile_id &&
              r.activity_date === insertPayload.activity_date
          );
          if (dup) return { error: { code: '23505', message: 'duplicate' } };
        }
        rows.push({ ...insertPayload });
        return { error: null };
      }

      if (mode === 'update') {
        for (const row of rows) {
          if (matches(row)) Object.assign(row, updatePayload);
        }
        return { error: null };
      }

      // select
      let result = rows.filter(matches);
      if (orderCol) {
        const { col, asc } = orderCol;
        result = [...result].sort((a, b) => {
          if (a[col] === b[col]) return 0;
          const cmp = a[col] > b[col] ? 1 : -1;
          return asc ? cmp : -cmp;
        });
      }
      return { data: result, error: null };
    };

    builder.maybeSingle = () => {
      const r = exec();
      if (r.error) return Promise.resolve({ data: null, error: r.error });
      return Promise.resolve({ data: (r.data ?? [])[0] ?? null, error: null });
    };
    builder.then = (resolve: any) => Promise.resolve(exec()).then(resolve);

    return builder;
  };

  return { client: { from } as unknown as StreaksClient, tables };
}

// ---------- Tests ----------

describe('streakFromDates', () => {
  const NOW = new Date(Date.UTC(2026, 6, 15)); // 15 julio 2026

  it('devuelve 0 con lista vacía', () => {
    expect(streakFromDates([], NOW)).toBe(0);
  });

  it('5 días consecutivos hasta hoy → 5', () => {
    const dates = [0, 1, 2, 3, 4].map((d) => offsetDate(d, NOW));
    expect(streakFromDates(dates, NOW)).toBe(5);
  });

  it('5 días con 1 día sin actividad en medio sigue contando como racha', () => {
    // hoy, ayer, [gap 1 día], hace 3, hace 4, hace 5 → 5 días activos
    const dates = [0, 1, 3, 4, 5].map((d) => offsetDate(d, NOW));
    expect(streakFromDates(dates, NOW)).toBe(5);
  });

  it('5 días con 2 días seguidos sin actividad rompen la racha', () => {
    // hoy, ayer, [gap 2 días], hace 4, hace 5, hace 6
    // El gap entre ayer (día 1) y hace 4 (día 4) es 3 → ROTA después de "ayer".
    const dates = [0, 1, 4, 5, 6].map((d) => offsetDate(d, NOW));
    expect(streakFromDates(dates, NOW)).toBe(2);
  });

  it('racha rota si último activo fue hace 2 días (ni hoy ni ayer)', () => {
    const dates = [2, 3, 4].map((d) => offsetDate(d, NOW));
    expect(streakFromDates(dates, NOW)).toBe(0);
  });

  it('solo hoy → 1', () => {
    expect(streakFromDates([offsetDate(0, NOW)], NOW)).toBe(1);
  });

  it('solo ayer → 1', () => {
    expect(streakFromDates([offsetDate(1, NOW)], NOW)).toBe(1);
  });
});

describe('checkStreakMilestone', () => {
  it('detecta 7 días', () => {
    expect(checkStreakMilestone(6, 7)).toBe(7);
  });
  it('detecta 14, 30, 60, 100', () => {
    expect(checkStreakMilestone(13, 14)).toBe(14);
    expect(checkStreakMilestone(29, 30)).toBe(30);
    expect(checkStreakMilestone(59, 60)).toBe(60);
    expect(checkStreakMilestone(99, 100)).toBe(100);
  });
  it('null cuando no cruza nada', () => {
    expect(checkStreakMilestone(8, 9)).toBeNull();
    expect(checkStreakMilestone(0, 0)).toBeNull();
  });
  it('null cuando previous ya estaba pasado el hito', () => {
    expect(checkStreakMilestone(7, 8)).toBeNull();
  });
  it('cuando salta varios hitos devuelve el mayor cruzado', () => {
    expect(checkStreakMilestone(5, 14)).toBe(14);
    expect(checkStreakMilestone(5, 100)).toBe(100);
  });
});

describe('recordDailyActivity', () => {
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const NOW = new Date(Date.UTC(2026, 6, 15));

  function seedProfile(streak = 0, longest = 0): ProfileRow {
    return {
      id: USER_ID,
      current_streak: streak,
      longest_streak: longest,
      last_streak_date: null
    };
  }

  it('primera actividad del usuario → streak=1, milestone=null', async () => {
    const { client, tables } = createFakeClient({ profiles: [seedProfile()] });
    const res = await recordDailyActivity(USER_ID, 'session_completed', null, client, NOW);
    expect(res.newStreak).toBe(1);
    expect(res.milestone).toBeNull();
    expect(res.newRecord).toBe(true);
    expect(tables.profiles[0].current_streak).toBe(1);
    expect(tables.profiles[0].longest_streak).toBe(1);
  });

  it('segunda llamada del mismo día es idempotente (no inserta)', async () => {
    const { client, tables } = createFakeClient({ profiles: [seedProfile()] });
    await recordDailyActivity(USER_ID, 'session_completed', null, client, NOW);
    const second = await recordDailyActivity(USER_ID, 'checkin', null, client, NOW);
    expect(second.newRecord).toBe(false);
    expect(second.newStreak).toBe(1);
    expect(tables.activities).toHaveLength(1);
  });

  it('al cruzar 7 días reporta milestone=7', async () => {
    // Sembrar 6 días previos consecutivos (hace 1..6) + previous_streak=6
    const seedActivities: ActivityRow[] = [1, 2, 3, 4, 5, 6].map((d) => ({
      profile_id: USER_ID,
      activity_date: offsetDate(d, NOW),
      type: 'session_completed',
      session_id: null
    }));
    const { client } = createFakeClient({
      profiles: [seedProfile(6, 6)],
      activities: seedActivities
    });
    const res = await recordDailyActivity(USER_ID, 'session_completed', 's_x', client, NOW);
    expect(res.newStreak).toBe(7);
    expect(res.milestone).toBe(7);
  });

  it('longest_streak no decrece — preserva máximo histórico', async () => {
    const { client, tables } = createFakeClient({ profiles: [seedProfile(0, 12)] });
    await recordDailyActivity(USER_ID, 'app_open', null, client, NOW);
    expect(tables.profiles[0].longest_streak).toBe(12);
    expect(tables.profiles[0].current_streak).toBe(1);
  });
});
