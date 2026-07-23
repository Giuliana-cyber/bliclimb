/**
 * Onboarding v2 · helpers de lectura/escritura contra Supabase.
 *
 * Deliberadamente separado de lib/db/profile.ts (schema legacy) para
 * no acoplarse a los renombres de columnas del audit-360. Usa las
 * columnas nuevas agregadas por la migración 0029.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OnboardingState } from '@/app/onboarding-v2/types';
import type { Profile as MotorProfile } from '@/lib/brain/motor-inverted/types';

// Shape parcial · solo las columnas que consume el flow v2.
export interface ProfileV2Row {
  id: string;
  character: 'bill' | 'senda' | null;
  age: string | null;
  climbing_time: string | null;
  level: string | null; // guarda el "grado" (V4-V6, 5.11, no-se…)
  disciplina: 'boulder' | 'ruta' | 'no-se' | null;
  estado_actual: 'activo' | 'volviendo-paron' | 'volviendo-lesion' | 'empezando' | null;
  techo_historico: string | null;
  hang_25mm_seconds: number | null;
  max_pullup_reps: number | null;
  estilos: string[] | null;
  objetivo: string | null;
  equipment: string[] | null;
  days_per_week: number | null;
  mas_equipo_pronto: boolean | null;
  has_active_lesion: boolean | null;
  zonas_lesion: string[] | null;
  dolor_hoy: 'nada' | 'molestia' | 'dolor' | null;
  embarazo: 'no-aplica' | 'si' | null;
  injuries: string[] | null;
  current_finger_pain: number | null;
  current_shoulder_pain: number | null;
  current_elbow_pain: number | null;
  onboarded_at: string | null;
}

export interface ProfileV2Result {
  userId: string | null;
  profile: ProfileV2Row | null;
  isOnboarded: boolean;
}

/**
 * Lee el profile del user autenticado. Retorna userId=null si no hay
 * sesión válida; isOnboarded=false si el user existe pero no completó
 * el onboarding (onboarded_at IS NULL).
 */
export async function getServerProfileV2(
  client: SupabaseClient,
): Promise<ProfileV2Result> {
  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return { userId: null, profile: null, isOnboarded: false };
  }

  const { data, error } = await client
    .from('profiles')
    .select(
      'id, character, age, climbing_time, level, disciplina, estado_actual, techo_historico, hang_25mm_seconds, max_pullup_reps, estilos, objetivo, equipment, days_per_week, mas_equipo_pronto, has_active_lesion, zonas_lesion, dolor_hoy, embarazo, injuries, current_finger_pain, current_shoulder_pain, current_elbow_pain, onboarded_at',
    )
    .eq('id', user.id)
    .maybeSingle<ProfileV2Row>();

  if (error) {
    // No lanzamos · fail-soft para no reventar /hoy si la row aún no
    // existe (el trigger handle_new_user la crea automático).
    return { userId: user.id, profile: null, isOnboarded: false };
  }

  const isOnboarded = Boolean(data?.onboarded_at);
  return { userId: user.id, profile: data ?? null, isOnboarded };
}

/**
 * Convierte el ProfileV2Row (Supabase) al Profile del motor invertido.
 * Rellena defaults conservadores cuando algo falta (fail-soft).
 */
export function profileRowToMotorProfile(row: ProfileV2Row): MotorProfile {
  // Mapear age v2 → climbingTime del motor.
  //   menor-16 se bloquea en el onboarding, no llega acá.
  //   Los rangos de edad no son entrada directa del motor, pero el
  //   climbing_time sí.
  return {
    age: 'adult',
    climbingTime: (row.climbing_time as MotorProfile['climbingTime']) ?? 'more3',
    hang25mmSeconds: row.hang_25mm_seconds ?? null,
    maxPullupReps: row.max_pullup_reps ?? null,
    currentFingerPain: row.current_finger_pain ?? 0,
    currentShoulderPain: row.current_shoulder_pain ?? 0,
    currentElbowPain: row.current_elbow_pain ?? 0,
    injuries: (row.injuries ?? []) as MotorProfile['injuries'],
    equipment: (row.equipment ?? ['home']) as MotorProfile['equipment'],
    character: (row.character ?? 'bill') as MotorProfile['character'],
  };
}

/**
 * UPSERT del profile a partir del state del onboarding-v2. Escribe
 * onboarded_at=now() para marcar el flow como completado.
 *
 * IMPORTANTE · antes de llamar esto, el caller ya validó que el user
 * NO es menor de 16 (bloqueo en OnboardingFlow.canProceedFor 'salud').
 */
export async function upsertOnboardingProfile(
  client: SupabaseClient,
  userId: string,
  state: OnboardingState,
): Promise<{ ok: boolean; error?: string }> {
  // Guardrail server-side · nunca escribimos menor-16 aunque el client
  // envíe eso (defensa en profundidad).
  if (state.edad === 'menor-16') {
    return {
      ok: false,
      error: 'Edad menor de 16 no permitida en v1',
    };
  }

  const update = {
    // Coach + narrativa base
    character: state.coach ?? 'bill',
    // Rendimiento
    disciplina: state.disciplina,
    level: state.grado, // "v4-v6" · "5.11" · "no-se"
    estado_actual: state.estadoActual,
    techo_historico: state.techoHistorico || null,
    hang_25mm_seconds:
      state.hangSeconds != null && state.hangSeconds >= 0 ? state.hangSeconds : null,
    max_pullup_reps:
      state.pullups != null && state.pullups >= 0 ? state.pullups : null,
    estilos: state.estilos,
    objetivo: state.objetivo,
    days_per_week: state.sesionesSemana,
    equipment: state.equipos,
    mas_equipo_pronto: state.masEquipoPronto,
    // Salud
    age: state.edad,
    has_active_lesion: state.hasActiveLesion,
    zonas_lesion: state.zonasLesion,
    injuries: state.hasInjury ? [state.injuryZone].filter(Boolean) : [],
    dolor_hoy: state.dolorHoy,
    embarazo: state.embarazo,
    // Cierra el flow
    onboarded_at: new Date().toISOString(),
  };

  const { error } = await client.from('profiles').update(update).eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
