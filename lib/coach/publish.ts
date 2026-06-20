// Materializa un coach_plan publicado en las tablas existentes plans + sessions.
// El cliente lo verá con la misma UI que cualquier plan generado por IA — solo
// que con plans.source='coach' y plans.coach_id apuntando al coach.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoachPlanData, CoachExercise } from './plan-data';

type Row = Record<string, unknown>;

function exerciseRow(ex: CoachExercise) {
  // Convertimos al shape de Exercise que consume la app del cliente,
  // rellenando con defaults los campos opcionales que el editor no pide.
  return {
    name: ex.name,
    description: '',
    sets: ex.sets,
    reps: ex.reps,
    rest: ex.rest,
    intensity: ex.intensity,
    notes: ex.notes,
    timerSeconds: null
  };
}

/**
 * Publica un coach_plan. Archiva planes previos del cliente y crea un nuevo
 * `plans` + sus `sessions` con `source='coach'` y `coach_id`. Devuelve el id
 * del plan materializado para que el caller lo guarde en
 * `coach_plans.published_plan_id`.
 */
export async function materializeCoachPlan(
  admin: SupabaseClient,
  args: {
    coachId: string;
    clientId: string;
    planData: CoachPlanData;
    title: string;
  }
): Promise<string> {
  const { coachId, clientId, planData } = args;
  const totalWeeks = planData.weeks.length;

  // Archivar planes activos previos del cliente.
  await admin
    .from('plans')
    .update({ status: 'archived' })
    .eq('profile_id', clientId)
    .eq('status', 'active');

  const insertPayload: Row = {
    profile_id: clientId,
    status: 'active',
    total_weeks: totalWeeks,
    current_week: 1,
    start_date: new Date().toISOString(),
    source: 'coach',
    coach_id: coachId
  };

  const { data: planRow, error: planError } = await admin
    .from('plans')
    .insert(insertPayload)
    .select('id')
    .single();
  if (planError || !planRow) {
    throw new Error(`materializeCoachPlan plan insert failed: ${planError?.message ?? 'no row'}`);
  }
  const planId = (planRow as { id: string }).id;

  // Sessions normalizadas.
  const sessionRows: Row[] = [];
  for (const week of planData.weeks) {
    for (const session of week.sessions) {
      sessionRows.push({
        plan_id: planId,
        week_number: week.weekNumber,
        day_number: session.dayNumber,
        week_theme: week.theme,
        week_objective: week.objective,
        title: session.title,
        location: session.location,
        estimated_minutes: session.estimatedMinutes,
        objective: session.objective,
        intensity_target: session.intensityTarget,
        warmup: session.warmup.map(exerciseRow),
        main_block: session.mainBlock.map(exerciseRow),
        cooldown: session.cooldown.map(exerciseRow),
        nutrition_tip: '',
        source: '',
        completed: false
      });
    }
  }

  if (sessionRows.length > 0) {
    const { error: sessionsError } = await admin.from('sessions').insert(sessionRows);
    if (sessionsError) {
      throw new Error(`materializeCoachPlan sessions insert failed: ${sessionsError.message}`);
    }
  }

  return planId;
}
