import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

const PROFILE_STORAGE_KEY = 'bilclimb:profile';
const PROFILE_REGENERATION_KEY = 'bilclimb:profile-needs-plan-regeneration';

export interface UserProfile {
  id: string;
  character: 'bill' | 'senda';
  name: string;
  age: string; // 'u16' | '16-25' | '26-35' | '36-45' | '46+'
  sex: string; // 'male' | 'female' | 'na'
  weight: number | null;
  height: number | null;
  climbingTime: string; // 'start' | 'less1' | '1to3' | 'more3'
  disciplines: string[]; // ['boulder', 'sport', ...]
  level: string; // 'none' | 'beginner' | 'intermediate' | 'advanced' | 'elite'
  setting: string; // 'indoor' | 'outdoor' | 'both'
  injuries: string[]; // ['none'] | ['fingers', 'elbows', ...]
  injuryNotes: string;
  warmup: string; // 'always' | 'sometimes' | 'rarely'
  sleep: string; // 'good' | 'regular' | 'bad'
  energy: string; // 'high' | 'normal' | 'low' | 'variable'
  daysPerWeek: number; // 1-7 — total (climbing + training extra), derivado en onboarding
  // Bloque 3 audit-360 (H-03): desglose de los "días por semana" para que
  // el motor sepa cuántos son de escalada vs entrenamiento extra. `optional`
  // por compatibilidad con perfiles guardados antes de este bloque.
  climbingDaysPerWeek?: number;
  trainingDaysPerWeek?: number;
  equipment: string[]; // ['gym', 'hangboard', ...]
  equipmentNotes: string;
  previousTraining: string; // 'never' | 'informal' | 'structured' | 'coach'
  goal: string; // 'grade' | 'project' | 'technique' | 'fingers' | ...
  goals: string[]; // ['grade', 'technique', 'other']
  goalDescription: string;
  project: string; // "La Catrina 5.12a en El Salto"
  projectDescription: string;
  sessionDuration: number; // minutes available per training session
  maxSessionDuration: number; // maximum minutes if the plan needs a longer day
  availableDays: string[]; // ['monday', 'wednesday', ...]
  accessToCampusBoard: boolean;
  accessToHangboard: boolean;
  accessToTRX: boolean;
  accessToWeights: boolean;
  pullUpAbility: string;
  fingerTrainingExperience: string;
  campusExperience: string;
  currentFingerPain: number;
  currentShoulderPain: number;
  currentElbowPain: number;
  wantsConservativePlan: boolean;
  trainingAggressiveness: string;
  outdoorFrequency: string;
  rockProjectDescription: string;
  sleepQuality: string;
  energyLevel: string;
  injuryDescription: string;
  trainingHistory: string;
  planDuration: number; // 2 | 3 | 4
  // ---- Fuerza absoluta (B1 — strength). Todos opcionales menos los dos básicos. ----
  pullupsBodyweight: number | null; // 0-50
  pullupsAddedWeight5Reps: number | null; // kg adicionales a 5 reps, 0-50
  hangboard20mmSeconds: number | null; // segundos a BW en regleta 20mm, 0-30
  hangboard20mmAddedWeight7s: number | null; // kg adicionales para 7s en regleta 20mm
  benchPress1Rm: number | null; // 1RM press de banca en kg
  squat1Rm: number | null;
  deadlift1Rm: number | null;
  // -------------------------------------------------------------------------------
  createdAt: string;
  updatedAt: string;
}

function normalizeProfile(profile: UserProfile | null) {
  if (!profile) {
    return null;
  }

  const legacyGoal = typeof profile.goal === 'string' ? profile.goal : '';
  const goals = Array.isArray(profile.goals) && profile.goals.length ? profile.goals : legacyGoal ? [legacyGoal] : [];
  const project = typeof profile.project === 'string' ? profile.project : '';
  const injuryNotes = typeof profile.injuryNotes === 'string' ? profile.injuryNotes : '';
  const sleep = typeof profile.sleep === 'string' ? profile.sleep : '';
  const energy = typeof profile.energy === 'string' ? profile.energy : '';
  const previousTraining =
    typeof profile.previousTraining === 'string' ? profile.previousTraining : '';
  const equipment = Array.isArray(profile.equipment) ? profile.equipment : [];
  const normalizedSessionDuration =
    typeof profile.sessionDuration === 'number' && profile.sessionDuration > 0
      ? profile.sessionDuration
      : 90;

  return {
    ...profile,
    goal: legacyGoal || goals[0] || 'other',
    goals,
    goalDescription: typeof profile.goalDescription === 'string' ? profile.goalDescription : '',
    project,
    projectDescription: project,
    sessionDuration: normalizedSessionDuration,
    maxSessionDuration:
      typeof profile.maxSessionDuration === 'number' && profile.maxSessionDuration > 0
        ? profile.maxSessionDuration
        : normalizedSessionDuration,
    availableDays: Array.isArray(profile.availableDays) ? profile.availableDays : [],
    accessToCampusBoard:
      typeof profile.accessToCampusBoard === 'boolean'
        ? profile.accessToCampusBoard
        : equipment.includes('campus'),
    accessToHangboard:
      typeof profile.accessToHangboard === 'boolean'
        ? profile.accessToHangboard
        : equipment.includes('hangboard'),
    accessToTRX:
      typeof profile.accessToTRX === 'boolean' ? profile.accessToTRX : equipment.includes('trx'),
    accessToWeights:
      typeof profile.accessToWeights === 'boolean'
        ? profile.accessToWeights
        : equipment.includes('weights'),
    pullUpAbility: typeof profile.pullUpAbility === 'string' ? profile.pullUpAbility : 'unknown',
    fingerTrainingExperience:
      typeof profile.fingerTrainingExperience === 'string'
        ? profile.fingerTrainingExperience
        : 'unknown',
    campusExperience:
      typeof profile.campusExperience === 'string' ? profile.campusExperience : 'none',
    currentFingerPain:
      typeof profile.currentFingerPain === 'number' ? profile.currentFingerPain : 0,
    currentShoulderPain:
      typeof profile.currentShoulderPain === 'number' ? profile.currentShoulderPain : 0,
    currentElbowPain:
      typeof profile.currentElbowPain === 'number' ? profile.currentElbowPain : 0,
    wantsConservativePlan:
      typeof profile.wantsConservativePlan === 'boolean'
        ? profile.wantsConservativePlan
        : profile.trainingAggressiveness === 'conservative',
    trainingAggressiveness:
      typeof profile.trainingAggressiveness === 'string'
        ? profile.trainingAggressiveness
        : 'balanced',
    outdoorFrequency:
      typeof profile.outdoorFrequency === 'string' ? profile.outdoorFrequency : 'unknown',
    rockProjectDescription:
      typeof profile.rockProjectDescription === 'string'
        ? profile.rockProjectDescription
        : project,
    sleepQuality: sleep,
    energyLevel: energy,
    injuryNotes,
    injuryDescription: injuryNotes,
    previousTraining,
    trainingHistory: previousTraining,
    pullupsBodyweight:
      typeof profile.pullupsBodyweight === 'number' ? profile.pullupsBodyweight : null,
    pullupsAddedWeight5Reps:
      typeof profile.pullupsAddedWeight5Reps === 'number'
        ? profile.pullupsAddedWeight5Reps
        : null,
    hangboard20mmSeconds:
      typeof profile.hangboard20mmSeconds === 'number' ? profile.hangboard20mmSeconds : null,
    hangboard20mmAddedWeight7s:
      typeof profile.hangboard20mmAddedWeight7s === 'number'
        ? profile.hangboard20mmAddedWeight7s
        : null,
    benchPress1Rm: typeof profile.benchPress1Rm === 'number' ? profile.benchPress1Rm : null,
    squat1Rm: typeof profile.squat1Rm === 'number' ? profile.squat1Rm : null,
    deadlift1Rm: typeof profile.deadlift1Rm === 'number' ? profile.deadlift1Rm : null
  };
}

export function loadProfile() {
  return normalizeProfile(readStorage<UserProfile | null>(PROFILE_STORAGE_KEY, null));
}

export function saveProfile(profile: UserProfile) {
  const normalizedProfile = normalizeProfile(profile) ?? profile;
  writeStorage(PROFILE_STORAGE_KEY, normalizedProfile);
  return normalizedProfile;
}

export function updateProfile(updates: Partial<UserProfile>) {
  const currentProfile = loadProfile();

  if (!currentProfile) {
    return null;
  }

  const nextProfile: UserProfile = {
    ...currentProfile,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveProfile(nextProfile);
  return nextProfile;
}

export function clearProfile() {
  removeStorage(PROFILE_STORAGE_KEY);
  removeStorage(PROFILE_REGENERATION_KEY);
}

export function loadProfileNeedsRegeneration() {
  return readStorage<boolean>(PROFILE_REGENERATION_KEY, false);
}

export function markProfileNeedsRegeneration() {
  writeStorage(PROFILE_REGENERATION_KEY, true);
}

export function clearProfileNeedsRegeneration() {
  removeStorage(PROFILE_REGENERATION_KEY);
}
