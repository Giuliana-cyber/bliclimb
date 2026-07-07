import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/profile';

// Bloque 4 audit-360: ProfileRow refleja el schema post-migration 0013.
// Columnas ELIMINADAS: bench_press_1rm, squat_1rm, deadlift_1rm,
// previous_training, energy, energy_level, height, project,
// project_description.
// Columnas AGREGADAS: disciplines, setting, available_days,
// max_session_duration, pull_up_ability, finger_training_experience,
// climbing_days_per_week, training_days_per_week.
type ProfileRow = {
  id: string;
  character: 'bill' | 'senda';
  language: 'es' | 'en';
  name: string | null;
  age: string | null;
  sex: string | null;
  weight: number | null;
  climbing_time: string | null;
  disciplines: string[] | null;
  level: string | null;
  setting: string | null;
  goals: string[] | null;
  goal_description: string | null;
  training_history: string | null;
  equipment: string[] | null;
  equipment_notes: string | null;
  days_per_week: number | null;
  climbing_days_per_week: number | null;
  training_days_per_week: number | null;
  available_days: string[] | null;
  session_duration: number | null;
  max_session_duration: number | null;
  plan_duration: number | null;
  injuries: string[] | null;
  injury_description: string | null;
  injury_notes: string | null;
  current_finger_pain: number | null;
  current_shoulder_pain: number | null;
  current_elbow_pain: number | null;
  wants_conservative_plan: boolean | null;
  training_aggressiveness: string | null;
  sleep_quality: string | null;
  sleep: string | null;
  pull_up_ability: string | null;
  finger_training_experience: string | null;
  pullups_bodyweight: number | null;
  pullups_added_weight_5reps: number | null;
  hangboard_20mm_seconds: number | null;
  hangboard_20mm_added_weight_7s: number | null;
  needs_regeneration: boolean | null;
  created_at: string;
  updated_at: string;
};

function rowToProfile(row: ProfileRow): Partial<UserProfile> & { id: string } {
  return {
    id: row.id,
    character: row.character,
    name: row.name ?? '',
    age: row.age ?? '',
    sex: row.sex ?? '',
    weight: row.weight ?? null,
    climbingTime: row.climbing_time ?? '',
    disciplines: row.disciplines ?? [],
    level: row.level ?? '',
    setting: row.setting ?? '',
    goals: row.goals ?? [],
    goalDescription: row.goal_description ?? '',
    equipment: row.equipment ?? [],
    equipmentNotes: row.equipment_notes ?? '',
    daysPerWeek: row.days_per_week ?? 3,
    climbingDaysPerWeek: row.climbing_days_per_week ?? 0,
    trainingDaysPerWeek: row.training_days_per_week ?? 0,
    availableDays: row.available_days ?? [],
    sessionDuration: row.session_duration ?? 90,
    maxSessionDuration: row.max_session_duration ?? 90,
    planDuration: row.plan_duration ?? 4,
    injuries: row.injuries ?? [],
    injuryDescription: row.injury_description ?? '',
    injuryNotes: row.injury_notes ?? '',
    currentFingerPain: row.current_finger_pain ?? 0,
    currentShoulderPain: row.current_shoulder_pain ?? 0,
    currentElbowPain: row.current_elbow_pain ?? 0,
    wantsConservativePlan: row.wants_conservative_plan ?? false,
    trainingAggressiveness: row.training_aggressiveness ?? 'balanced',
    sleepQuality: row.sleep_quality ?? '',
    sleep: row.sleep ?? '',
    pullUpAbility: row.pull_up_ability ?? '',
    fingerTrainingExperience: row.finger_training_experience ?? '',
    pullupsBodyweight: row.pullups_bodyweight ?? null,
    pullupsAddedWeight5Reps: row.pullups_added_weight_5reps ?? null,
    hangboard20mmSeconds: row.hangboard_20mm_seconds ?? null,
    hangboard20mmAddedWeight7s: row.hangboard_20mm_added_weight_7s ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function profileToRow(profile: Partial<UserProfile>): Partial<ProfileRow> {
  return {
    character: profile.character,
    name: profile.name,
    age: profile.age,
    sex: profile.sex,
    weight: profile.weight,
    climbing_time: profile.climbingTime,
    disciplines: profile.disciplines,
    level: profile.level,
    setting: profile.setting,
    goals: profile.goals,
    goal_description: profile.goalDescription,
    equipment: profile.equipment,
    equipment_notes: profile.equipmentNotes,
    days_per_week: profile.daysPerWeek,
    climbing_days_per_week: profile.climbingDaysPerWeek,
    training_days_per_week: profile.trainingDaysPerWeek,
    available_days: profile.availableDays,
    session_duration: profile.sessionDuration,
    max_session_duration: profile.maxSessionDuration,
    plan_duration: profile.planDuration,
    injuries: profile.injuries,
    injury_description: profile.injuryDescription,
    injury_notes: profile.injuryNotes,
    current_finger_pain: profile.currentFingerPain,
    current_shoulder_pain: profile.currentShoulderPain,
    current_elbow_pain: profile.currentElbowPain,
    wants_conservative_plan: profile.wantsConservativePlan,
    training_aggressiveness: profile.trainingAggressiveness,
    sleep_quality: profile.sleepQuality,
    sleep: profile.sleep,
    pull_up_ability: profile.pullUpAbility,
    finger_training_experience: profile.fingerTrainingExperience,
    pullups_bodyweight: profile.pullupsBodyweight,
    pullups_added_weight_5reps: profile.pullupsAddedWeight5Reps,
    hangboard_20mm_seconds: profile.hangboard20mmSeconds,
    hangboard_20mm_added_weight_7s: profile.hangboard20mmAddedWeight7s
  };
}

// Export para tests round-trip (persistencia end-to-end).
export { profileToRow, rowToProfile, type ProfileRow };

export async function fetchProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Partial<UserProfile>
) {
  const row = { id: userId, ...profileToRow(profile) };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return rowToProfile(data as ProfileRow);
}

export async function markProfileNeedsRegenerationDb(
  supabase: SupabaseClient,
  userId: string,
  value: boolean
) {
  const { error } = await supabase
    .from('profiles')
    .update({ needs_regeneration: value })
    .eq('id', userId);

  if (error) throw error;
}
