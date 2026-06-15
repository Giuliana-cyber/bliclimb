import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrainingPlan, Week } from '@/lib/plan';

type PlanRow = {
  id: string;
  profile_id: string;
  status: 'active' | 'archived' | 'draft';
  plan_version: string | null;
  mesocycle_type: string | null;
  microcycles: TrainingPlan['microcycles'];
  planning_rationale: string | null;
  progression_model: string | null;
  total_weeks: number;
  current_week: number;
  start_date: string;
  used_file_search: boolean | null;
  library_sources: string[] | null;
  quality_scores: TrainingPlan['qualityScores'];
  created_at: string;
};

type SessionRow = {
  id: string;
  plan_id: string;
  week_number: number;
  day_number: number;
  microcycle_id: string | null;
  week_theme: string | null;
  week_objective: string | null;
  title: string;
  stimulus_type: string | null;
  location: string;
  equipment: string[] | null;
  estimated_minutes: number | null;
  estimated_duration_minutes: number | null;
  objective: string | null;
  why: string | null;
  intensity_target: string | null;
  safety_notes: string | null;
  adjustment_rules: string | null;
  success_criteria: string | null;
  warmup: Week['sessions'][number]['warmup'];
  main_block: Week['sessions'][number]['mainBlock'];
  cooldown: Week['sessions'][number]['cooldown'];
  source: string | null;
  nutrition_tip: string | null;
  completed: boolean;
  completed_at: string | null;
};

export async function fetchActivePlan(supabase: SupabaseClient, userId: string) {
  const { data: planRow, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError) throw planError;
  if (!planRow) return null;

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('plan_id', planRow.id)
    .order('week_number', { ascending: true })
    .order('day_number', { ascending: true });

  if (sessionsError) throw sessionsError;

  return rowsToPlan(planRow as PlanRow, (sessions ?? []) as SessionRow[]);
}

function rowsToPlan(plan: PlanRow, sessions: SessionRow[]): TrainingPlan {
  const weeks: Week[] = [];
  const weeksByNumber = new Map<number, Week>();

  for (const session of sessions) {
    let week = weeksByNumber.get(session.week_number);
    if (!week) {
      week = {
        weekNumber: session.week_number,
        microcycleId: session.microcycle_id,
        theme: session.week_theme ?? '',
        objective: session.week_objective,
        focusAreas: [],
        sessions: []
      };
      weeksByNumber.set(session.week_number, week);
      weeks.push(week);
    }
    week.sessions.push({
      dayNumber: session.day_number,
      title: session.title,
      stimulusType: session.stimulus_type,
      location: session.location,
      equipment: session.equipment,
      estimatedMinutes: session.estimated_minutes ?? 0,
      estimatedDurationMinutes: session.estimated_duration_minutes,
      objective: session.objective,
      why: session.why,
      intensityTarget: session.intensity_target,
      warmup: session.warmup ?? [],
      mainBlock: session.main_block ?? [],
      cooldown: session.cooldown ?? [],
      safetyNotes: session.safety_notes ? [session.safety_notes] : null,
      adjustmentRules: session.adjustment_rules ? [session.adjustment_rules] : null,
      successCriteria: session.success_criteria ? [session.success_criteria] : null,
      nutritionTip: session.nutrition_tip ?? '',
      source: session.source ?? '',
      completed: session.completed,
      checkIn: null
    });
  }

  return {
    id: plan.id,
    profileId: plan.profile_id,
    planVersion: plan.plan_version,
    objective: '',
    mesocycleType: plan.mesocycle_type,
    microcycles: plan.microcycles,
    planningRationale: plan.planning_rationale,
    progressionModel: plan.progression_model,
    totalWeeks: plan.total_weeks,
    currentWeek: plan.current_week,
    startDate: plan.start_date,
    weeks,
    status: plan.status === 'active' ? 'active' : 'paused',
    createdAt: plan.created_at,
    usedFileSearch: plan.used_file_search,
    librarySources: plan.library_sources,
    qualityScores: plan.quality_scores
  };
}

export async function savePlan(
  supabase: SupabaseClient,
  userId: string,
  plan: TrainingPlan
) {
  // Archivar planes previos activos
  await supabase
    .from('plans')
    .update({ status: 'archived' })
    .eq('profile_id', userId)
    .eq('status', 'active');

  const { data: planRow, error: planError } = await supabase
    .from('plans')
    .insert({
      profile_id: userId,
      status: 'active',
      plan_version: plan.planVersion,
      mesocycle_type: plan.mesocycleType,
      microcycles: plan.microcycles,
      planning_rationale: plan.planningRationale,
      progression_model: plan.progressionModel,
      total_weeks: plan.totalWeeks,
      current_week: plan.currentWeek,
      start_date: plan.startDate,
      used_file_search: plan.usedFileSearch,
      library_sources: plan.librarySources,
      quality_scores: plan.qualityScores
    })
    .select()
    .single();

  if (planError) throw planError;

  const sessionRows = plan.weeks.flatMap((week) =>
    week.sessions.map((session) => ({
      plan_id: planRow.id,
      week_number: week.weekNumber,
      day_number: session.dayNumber,
      microcycle_id: week.microcycleId,
      week_theme: week.theme,
      week_objective: week.objective,
      title: session.title,
      stimulus_type: session.stimulusType,
      location: session.location,
      equipment: session.equipment,
      estimated_minutes: session.estimatedMinutes,
      estimated_duration_minutes: session.estimatedDurationMinutes,
      objective: session.objective,
      why: session.why,
      intensity_target: session.intensityTarget,
      warmup: session.warmup,
      main_block: session.mainBlock,
      cooldown: session.cooldown,
      safety_notes: session.safetyNotes?.[0] ?? null,
      adjustment_rules: session.adjustmentRules?.[0] ?? null,
      success_criteria: session.successCriteria?.[0] ?? null,
      source: session.source,
      nutrition_tip: session.nutritionTip,
      completed: session.completed
    }))
  );

  if (sessionRows.length > 0) {
    const { error: sessionsError } = await supabase.from('sessions').insert(sessionRows);
    if (sessionsError) throw sessionsError;
  }

  return planRow.id as string;
}
