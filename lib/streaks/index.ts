// Sistema de rachas (streaks) basado en `daily_activity`.
//
// Regla: la racha cuenta el número de "días con actividad" más reciente,
// considerando que 1 día sin actividad NO la rompe pero 2+ días seguidos sí.
//
// Implementación: ordenar fechas activas descendiendo desde hoy. Si la
// diferencia entre dos días activos consecutivos supera 2, la racha
// termina ahí. Si el último activo fue hace >1 día (ni hoy ni ayer), la
// racha actual es 0.
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActivityType = 'session_completed' | 'checkin' | 'app_open';

export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export type StreaksClient = SupabaseClient;

function defaultClient(): StreaksClient {
  return createAdminClient();
}

// ---------- Cálculo puro ----------

/**
 * Convierte una Date a `YYYY-MM-DD` en UTC. Usamos UTC para que la racha
 * sea determinística sin importar la TZ del server (Vercel está en UTC).
 */
function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcula días entre dos fechas (formato YYYY-MM-DD), siempre positivo.
 */
function daysBetween(later: string, earlier: string): number {
  const a = Date.UTC(
    Number(later.slice(0, 4)),
    Number(later.slice(5, 7)) - 1,
    Number(later.slice(8, 10))
  );
  const b = Date.UTC(
    Number(earlier.slice(0, 4)),
    Number(earlier.slice(5, 7)) - 1,
    Number(earlier.slice(8, 10))
  );
  return Math.round((a - b) / 86_400_000);
}

/**
 * Aplica la regla de racha sobre fechas YYYY-MM-DD ordenadas descendiendo.
 * `now` es opcional (para tests).
 *
 * Regla:
 * - Si la fecha más reciente fue hace > 1 día respecto a `now`, racha = 0.
 * - Si la diferencia entre dos fechas activas consecutivas supera 2 días
 *   (= 2+ días seguidos sin actividad entre ellas), la racha termina ahí.
 */
export function streakFromDates(datesDesc: string[], now: Date = new Date()): number {
  if (datesDesc.length === 0) return 0;
  const today = toDateKey(now);
  const firstGap = daysBetween(today, datesDesc[0]);
  if (firstGap > 1) return 0;
  let streak = 1;
  for (let i = 1; i < datesDesc.length; i += 1) {
    const gap = daysBetween(datesDesc[i - 1], datesDesc[i]);
    if (gap > 2) break;
    streak += 1;
  }
  return streak;
}

/**
 * Devuelve el milestone (7/14/30/60/100) que `newStreak` cruzó cuando
 * `previousStreak` no lo había cruzado. Si cruzó varios de golpe (raro:
 * por un backfill, ej. prev=5 → new=14), devuelve el MAYOR.
 */
export function checkStreakMilestone(
  previousStreak: number,
  newStreak: number
): StreakMilestone | null {
  // Recorrer descendente para reportar el más alto que cruzó.
  for (const m of [...STREAK_MILESTONES].reverse()) {
    if (previousStreak < m && newStreak >= m) return m;
  }
  return null;
}

// ---------- IO ----------

/**
 * Lee las fechas activas de los últimos N días para un usuario. Devuelve
 * `YYYY-MM-DD[]` ordenado descendiendo.
 */
export async function getActivityDates(
  userId: string,
  client: StreaksClient = defaultClient(),
  daysBack = 200
): Promise<string[]> {
  const since = new Date(Date.now() - daysBack * 86_400_000);
  const sinceKey = toDateKey(since);
  const { data, error } = await client
    .from('daily_activity')
    .select('activity_date')
    .eq('profile_id', userId)
    .gte('activity_date', sinceKey)
    .order('activity_date', { ascending: false });
  if (error) throw new Error(`getActivityDates failed: ${error.message}`);
  return ((data ?? []) as Array<{ activity_date: string }>).map((r) => r.activity_date);
}

/**
 * Calcula la racha actual leyendo `daily_activity`. Wrapper de
 * `streakFromDates` + IO.
 */
export async function calculateStreak(
  userId: string,
  client: StreaksClient = defaultClient(),
  now: Date = new Date()
): Promise<number> {
  const dates = await getActivityDates(userId, client);
  return streakFromDates(dates, now);
}

export type RecordActivityResult = {
  /** Racha resultante después de registrar la actividad. */
  newStreak: number;
  /** Racha previa (antes de esta actividad). */
  previousStreak: number;
  /** Milestone cruzado por esta actividad, o null. */
  milestone: StreakMilestone | null;
  /** `true` si insertamos una fila nueva en daily_activity; `false` si ya existía. */
  newRecord: boolean;
};

/**
 * Registra actividad del día. Idempotente: si ya hay actividad para
 * (profile_id, activity_date), no inserta y devuelve el estado actual sin
 * recalcular nada (el UNIQUE constraint asegura una fila por día).
 *
 * Después de insertar:
 *   - Recalcula la racha actual.
 *   - Actualiza profiles.current_streak / longest_streak / last_streak_date.
 *   - Devuelve el milestone si la actividad cruzó uno (7/14/30/60/100).
 */
export async function recordDailyActivity(
  userId: string,
  type: ActivityType,
  sessionId: string | null = null,
  client: StreaksClient = defaultClient(),
  now: Date = new Date()
): Promise<RecordActivityResult> {
  const dateKey = toDateKey(now);

  // Leer el streak previo + ver si ya hay actividad hoy.
  const { data: profileRow, error: profileErr } = await client
    .from('profiles')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .maybeSingle();
  if (profileErr) {
    throw new Error(`recordDailyActivity profile read failed: ${profileErr.message}`);
  }
  const previousStreak = (profileRow as { current_streak?: number } | null)?.current_streak ?? 0;
  const previousLongest = (profileRow as { longest_streak?: number } | null)?.longest_streak ?? 0;

  // Intentar insertar la fila. Si ya existe (mismo día), no rompemos.
  const { error: insertErr } = await client
    .from('daily_activity')
    .insert({
      profile_id: userId,
      activity_date: dateKey,
      type,
      session_id: sessionId
    });

  let newRecord = true;
  if (insertErr) {
    // 23505 = unique_violation → ya había actividad hoy.
    const code = (insertErr as { code?: string }).code;
    if (code === '23505') {
      newRecord = false;
    } else {
      throw new Error(`recordDailyActivity insert failed: ${insertErr.message}`);
    }
  }

  // Recalcular racha (también cuando ya había fila hoy — el usuario pudo
  // haber estado offline y ahora abre la app y el cálculo previo está
  // desactualizado).
  const newStreak = await calculateStreak(userId, client, now);
  const nextLongest = Math.max(previousLongest, newStreak);

  // Actualizar el resumen en profiles.
  const { error: updErr } = await client
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: nextLongest,
      last_streak_date: dateKey
    })
    .eq('id', userId);
  if (updErr) {
    throw new Error(`recordDailyActivity profile update failed: ${updErr.message}`);
  }

  return {
    previousStreak,
    newStreak,
    milestone: checkStreakMilestone(previousStreak, newStreak),
    newRecord
  };
}
