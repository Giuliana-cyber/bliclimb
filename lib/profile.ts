import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

const PROFILE_STORAGE_KEY = 'bilclimb:profile';
const PROFILE_REGENERATION_KEY = 'bilclimb:profile-needs-plan-regeneration';

// Bloque 4 audit-360: se recortaron 14 campos (9 aprobados por Giuliana +
// 5 aliases/duplicados que quedaban huérfanos). Ver docs/audit-360.md y
// migration 0013_audit_360_profile_schema.sql. Los campos cortados fueron:
//   height, warmup, energy, energyLevel (alias), previousTraining,
//   trainingHistory (alias), outdoorFrequency, campusExperience,
//   benchPress1Rm, squat1Rm, deadlift1Rm, project, projectDescription
//   (alias), rockProjectDescription (fusionado en goalDescription).
export interface UserProfile {
  id: string;
  character: 'bill' | 'senda';
  name: string;
  age: string; // 'u16' | '16-25' | '26-35' | '36-45' | '46+'
  sex: string; // 'male' | 'female' | 'na'
  weight: number | null;
  climbingTime: string; // 'start' | 'less1' | '1to3' | 'more3'
  disciplines: string[]; // ['boulder', 'sport', ...]
  level: string; // 'none' | 'beginner' | 'intermediate' | 'advanced' | 'elite'
  setting: string; // 'indoor' | 'outdoor' | 'both'
  injuries: string[]; // ['none'] | ['fingers', 'elbows', ...]
  injuryNotes: string;
  sleep: string; // 'good' | 'regular' | 'bad'
  daysPerWeek: number; // 1-7 — total (climbing + training extra), derivado en onboarding
  // Bloque 3 audit-360 (H-03): desglose de los "días por semana" para que
  // el motor sepa cuántos son de escalada vs entrenamiento extra. `optional`
  // por compatibilidad con perfiles guardados antes del Bloque 3.
  climbingDaysPerWeek?: number;
  trainingDaysPerWeek?: number;
  equipment: string[]; // ['gym', 'hangboard', ...]
  equipmentNotes: string;
  goal: string; // 'grade' | 'project' | 'technique' | 'fingers' | ...
  goals: string[]; // ['grade', 'technique', 'other']
  // Bloque 4 audit-360: `goalDescription` unifica lo que antes eran 3
  // textareas separadas (goalDescription + project + rockProjectDescription).
  // La lógica de concatenación legacy vive en normalizeProfile.
  goalDescription: string;
  sessionDuration: number; // minutes available per training session
  maxSessionDuration: number; // maximum minutes if the plan needs a longer day
  availableDays: string[]; // ['monday', 'wednesday', ...]
  accessToCampusBoard: boolean;
  accessToHangboard: boolean;
  accessToTRX: boolean;
  accessToWeights: boolean;
  pullUpAbility: string;
  fingerTrainingExperience: string;
  currentFingerPain: number;
  currentShoulderPain: number;
  currentElbowPain: number;
  wantsConservativePlan: boolean;
  trainingAggressiveness: string;
  sleepQuality: string;
  injuryDescription: string;
  planDuration: number; // 2 | 3 | 4
  // ---- Fuerza (recortado Bloque 4 — solo los 4 relevantes para escalada). ----
  pullupsBodyweight: number | null; // 0-50
  pullupsAddedWeight5Reps: number | null; // kg adicionales a 5 reps, 0-50
  hangboard20mmSeconds: number | null; // segundos a BW en regleta 20mm, 0-30
  hangboard20mmAddedWeight7s: number | null; // kg adicionales para 7s en regleta 20mm
  // ---------------------------------------------------------------------------
  createdAt: string;
  updatedAt: string;
}

// Bloque 4 audit-360 (compat legacy): perfiles guardados antes de este
// bloque tienen `project` y `rockProjectDescription` como campos aparte.
// Al leerlos los concatenamos en `goalDescription` con un separador — una
// sola textarea es la nueva superficie. La operación es idempotente: si el
// perfil no tiene esos campos legacy, no pasa nada.
export function mergeLegacyGoalTextareas(
  goalDescription: string,
  project: string,
  rockProjectDescription: string
): string {
  const parts: string[] = [];
  const gd = goalDescription.trim();
  const p = project.trim();
  const rpd = rockProjectDescription.trim();
  if (gd) parts.push(gd);
  // Si `project` ya viene incluido literalmente en goalDescription
  // (por doble render), no lo duplicamos.
  if (p && !gd.includes(p)) parts.push(p);
  if (rpd && !gd.includes(rpd) && rpd !== p) parts.push(rpd);
  return parts.join('\n\n');
}

function normalizeProfile(profile: UserProfile | null) {
  if (!profile) {
    return null;
  }

  // Lectura defensiva de campos legacy: pueden venir de localStorage viejo
  // aunque el type ya no los declare. Los tratamos como `unknown` y los
  // fusionamos donde corresponda.
  const legacyBag = profile as unknown as Record<string, unknown>;
  const legacyGoal = typeof profile.goal === 'string' ? profile.goal : '';
  const goals = Array.isArray(profile.goals) && profile.goals.length ? profile.goals : legacyGoal ? [legacyGoal] : [];
  const injuryNotes = typeof profile.injuryNotes === 'string' ? profile.injuryNotes : '';
  const sleep = typeof profile.sleep === 'string' ? profile.sleep : '';
  const equipment = Array.isArray(profile.equipment) ? profile.equipment : [];
  const normalizedSessionDuration =
    typeof profile.sessionDuration === 'number' && profile.sessionDuration > 0
      ? profile.sessionDuration
      : 90;
  const legacyProject =
    typeof legacyBag.project === 'string' ? (legacyBag.project as string) : '';
  const legacyRockProjectDescription =
    typeof legacyBag.rockProjectDescription === 'string'
      ? (legacyBag.rockProjectDescription as string)
      : '';
  const mergedGoalDescription = mergeLegacyGoalTextareas(
    typeof profile.goalDescription === 'string' ? profile.goalDescription : '',
    legacyProject,
    legacyRockProjectDescription
  );

  const normalized: UserProfile = {
    ...profile,
    goal: legacyGoal || goals[0] || 'other',
    goals,
    goalDescription: mergedGoalDescription,
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
    sleepQuality: sleep,
    injuryNotes,
    injuryDescription: injuryNotes,
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
        : null
  };

  // Bloque 4: purgamos los campos cortados de `...profile` spread. Aunque el
  // type ya no los declara, un perfil legacy los trae en el objeto y podría
  // filtrarse por spread. Lo forzamos out con delete sobre una copia.
  const legacyKeys = [
    'height',
    'warmup',
    'energy',
    'energyLevel',
    'previousTraining',
    'trainingHistory',
    'outdoorFrequency',
    'campusExperience',
    'benchPress1Rm',
    'squat1Rm',
    'deadlift1Rm',
    'project',
    'projectDescription',
    'rockProjectDescription'
  ] as const;
  for (const key of legacyKeys) {
    delete (normalized as unknown as Record<string, unknown>)[key];
  }
  return normalized;
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
