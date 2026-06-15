import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/profile';

type ProfileRow = {
  id: string;
  character: 'bill' | 'senda';
  language: 'es' | 'en';
  name: string | null;
  age: string | null;
  climbing_time: string | null;
  level: string | null;
  goals: string[] | null;
  goal_description: string | null;
  project: string | null;
  project_description: string | null;
  training_history: string | null;
  previous_training: string | null;
  equipment: string[] | null;
  equipment_notes: string | null;
  days_per_week: number | null;
  session_duration: number | null;
  plan_duration: number | null;
  injuries: string[] | null;
  injury_description: string | null;
  injury_notes: string | null;
  current_finger_pain: number | null;
  current_shoulder_pain: number | null;
  current_elbow_pain: number | null;
  wants_conservative_plan: boolean | null;
  training_aggressiveness: string | null;
  energy_level: string | null;
  energy: string | null;
  sleep_quality: string | null;
  sleep: string | null;
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
    climbingTime: row.climbing_time ?? '',
    level: row.level ?? '',
    goals: row.goals ?? [],
    goalDescription: row.goal_description ?? '',
    project: row.project ?? '',
    projectDescription: row.project_description ?? '',
    trainingHistory: row.training_history ?? '',
    previousTraining: row.previous_training ?? '',
    equipment: row.equipment ?? [],
    equipmentNotes: row.equipment_notes ?? '',
    daysPerWeek: row.days_per_week ?? 3,
    sessionDuration: row.session_duration ?? 90,
    planDuration: row.plan_duration ?? 8,
    injuries: row.injuries ?? [],
    injuryDescription: row.injury_description ?? '',
    injuryNotes: row.injury_notes ?? '',
    currentFingerPain: row.current_finger_pain ?? 0,
    currentShoulderPain: row.current_shoulder_pain ?? 0,
    currentElbowPain: row.current_elbow_pain ?? 0,
    wantsConservativePlan: row.wants_conservative_plan ?? false,
    trainingAggressiveness: row.training_aggressiveness ?? 'balanced',
    energyLevel: row.energy_level ?? '',
    energy: row.energy ?? '',
    sleepQuality: row.sleep_quality ?? '',
    sleep: row.sleep ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function profileToRow(profile: Partial<UserProfile>): Partial<ProfileRow> {
  return {
    character: profile.character,
    name: profile.name,
    age: profile.age,
    climbing_time: profile.climbingTime,
    level: profile.level,
    goals: profile.goals,
    goal_description: profile.goalDescription,
    project: profile.project,
    project_description: profile.projectDescription,
    training_history: profile.trainingHistory,
    previous_training: profile.previousTraining,
    equipment: profile.equipment,
    equipment_notes: profile.equipmentNotes,
    days_per_week: profile.daysPerWeek,
    session_duration: profile.sessionDuration,
    plan_duration: profile.planDuration,
    injuries: profile.injuries,
    injury_description: profile.injuryDescription,
    injury_notes: profile.injuryNotes,
    current_finger_pain: profile.currentFingerPain,
    current_shoulder_pain: profile.currentShoulderPain,
    current_elbow_pain: profile.currentElbowPain,
    wants_conservative_plan: profile.wantsConservativePlan,
    training_aggressiveness: profile.trainingAggressiveness,
    energy_level: profile.energyLevel,
    energy: profile.energy,
    sleep_quality: profile.sleepQuality,
    sleep: profile.sleep
  };
}

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
