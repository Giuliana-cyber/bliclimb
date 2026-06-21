// Helper server-side para construir el resumen semanal de un usuario.
// Lee `sessions` (completadas / totales de la semana) + `check_ins`
// (avgRPE, fingerPain) + racha actual. Devuelve un objeto serializable
// que se guarda en weekly_summaries.data y se renderiza en la página.

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateStreak } from '@/lib/streaks';
import type { CharacterKey } from '@/lib/celebrations/messages';

export type WeeklySummary = {
  weekNumber: number;
  sessionsCompleted: number;
  sessionsTotal: number;
  averageRPE: number | null;
  fingerPainAvg: number | null;
  currentStreak: number;
  personalizedMessage: string;
};

function avg(values: number[]): number | null {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((a, b) => a + b, 0);
  return Math.round((sum / filtered.length) * 10) / 10;
}

/**
 * Mensaje personalizado en la voz del personaje, basado en los stats.
 * Se mantiene simple: 4 ramas por personaje según completitud y RPE.
 * Si querés más variedad después, lo expandimos.
 */
export function buildWeeklyMessage(input: {
  character: CharacterKey;
  sessionsCompleted: number;
  sessionsTotal: number;
  averageRPE: number | null;
  fingerPainAvg: number | null;
  currentStreak: number;
}): string {
  const {
    character,
    sessionsCompleted,
    sessionsTotal,
    averageRPE,
    fingerPainAvg,
    currentStreak
  } = input;
  const fullCompletion = sessionsTotal > 0 && sessionsCompleted === sessionsTotal;
  const noCompletion = sessionsCompleted === 0;
  const highPain = (fingerPainAvg ?? 0) >= 3;
  const highRPE = (averageRPE ?? 0) >= 8;

  if (character === 'senda') {
    if (fullCompletion && currentStreak >= 7) {
      return `Hiciste cada sesión esta semana. ${currentStreak} días de racha, y se nota. Tu cuerpo está aprendiendo a confiar en este plan.`;
    }
    if (fullCompletion) {
      return `Cerraste la semana completa. Eso ya cambió tu base. Confiá en lo que estás construyendo.`;
    }
    if (highPain) {
      return `Cumpliste ${sessionsCompleted} de ${sessionsTotal}, pero notamos que el dolor de dedos subió. Próxima semana priorizá técnica y descanso, sin culpa.`;
    }
    if (highRPE) {
      return `Esta semana pegó duro (RPE promedio ${averageRPE}). Llegaste hasta donde te dio el cuerpo. Esa información también es parte del plan.`;
    }
    if (noCompletion) {
      return `Esta semana no salió. Está bien. Recuperá el ritmo con una sesión corta. Lo importante es volver, no la perfección.`;
    }
    return `${sessionsCompleted} de ${sessionsTotal} sesiones. Es progreso real, aunque no se sienta perfecto. Vamos por la siguiente.`;
  }

  // BILL
  if (fullCompletion && currentStreak >= 7) {
    return `Cumpliste todo. ${currentStreak} días seguidos. Esto ya es trabajo serio, no entusiasmo de semana 1.`;
  }
  if (fullCompletion) {
    return `Semana cerrada al 100%. Es exactamente el tipo de adherencia que mueve el dial. Mantenelo.`;
  }
  if (highPain) {
    return `Hiciste ${sessionsCompleted}/${sessionsTotal}, pero el dolor de dedos subió a ${fingerPainAvg}. Próxima semana bajamos volumen de hangboard. No negociable.`;
  }
  if (highRPE) {
    return `RPE promedio ${averageRPE}: tu cuerpo está cerca del límite. Pulse y descanso esta semana, fuerza máxima la próxima.`;
  }
  if (noCompletion) {
    return `Cero sesiones esta semana. No hay vuelta: arrancá con la más corta del plan y construí desde ahí.`;
  }
  return `${sessionsCompleted}/${sessionsTotal}. Más que cero, menos que todo. La consistencia es la que paga; vamos por la próxima.`;
}

/**
 * Construye el resumen para una semana específica del plan del usuario.
 * Si `weekNumber` se omite, usa la semana actual derivada del plan.
 *
 * Stats:
 * - sessionsCompleted: filas de `sessions` con week_number=N y completed=true
 * - sessionsTotal: filas con week_number=N
 * - averageRPE / fingerPainAvg: de check_ins en el rango de fechas de la semana
 *   actual (aprox 7 días desde ahora hacia atrás, sin estricta alineación
 *   lunes-domingo para v1).
 * - currentStreak: calculateStreak(userId)
 */
export async function buildWeeklySummary(
  userId: string,
  character: CharacterKey,
  admin: SupabaseClient,
  weekNumber?: number,
  now: Date = new Date()
): Promise<WeeklySummary | null> {
  // 1. Buscar plan activo del usuario.
  const { data: planRow } = await admin
    .from('plans')
    .select('id, current_week, total_weeks')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!planRow) return null;
  const plan = planRow as { id: string; current_week: number; total_weeks: number };
  const wk = weekNumber ?? plan.current_week ?? 1;

  // 2. Sessions de la semana.
  const { data: sessionsRows } = await admin
    .from('sessions')
    .select('id, completed')
    .eq('plan_id', plan.id)
    .eq('week_number', wk);
  const sessions = (sessionsRows ?? []) as Array<{ id: string; completed: boolean }>;
  const sessionsCompleted = sessions.filter((s) => s.completed).length;
  const sessionsTotal = sessions.length;

  // 3. Check-ins de los últimos 7 días — proxy razonable para "esta semana".
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data: checkRows } = await admin
    .from('check_ins')
    .select('rpe, finger_pain')
    .eq('profile_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });
  const checks = (checkRows ?? []) as Array<{ rpe: number | null; finger_pain: number | null }>;
  const averageRPE = avg(checks.map((c) => c.rpe ?? 0));
  const fingerPainAvg = avg(checks.map((c) => c.finger_pain ?? 0));

  // 4. Racha actual.
  const currentStreak = await calculateStreak(userId, admin);

  // 5. Mensaje personalizado.
  const personalizedMessage = buildWeeklyMessage({
    character,
    sessionsCompleted,
    sessionsTotal,
    averageRPE,
    fingerPainAvg,
    currentStreak
  });

  return {
    weekNumber: wk,
    sessionsCompleted,
    sessionsTotal,
    averageRPE,
    fingerPainAvg,
    currentStreak,
    personalizedMessage
  };
}

/**
 * Upsert idempotente por (profile_id, week_number). No setea viewed_at;
 * eso lo hace la página cuando el usuario llega.
 */
export async function persistWeeklySummary(
  userId: string,
  summary: WeeklySummary,
  admin: SupabaseClient
): Promise<void> {
  await (admin as unknown as {
    from: (t: string) => {
      upsert: (
        v: Record<string, unknown>,
        opts: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>;
    };
  })
    .from('weekly_summaries')
    .upsert(
      {
        profile_id: userId,
        week_number: summary.weekNumber,
        data: summary
      },
      { onConflict: 'profile_id,week_number' }
    );
}
