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
  daysPerWeek: number; // 1-7
  equipment: string[]; // ['gym', 'hangboard', ...]
  equipmentNotes: string;
  previousTraining: string; // 'never' | 'informal' | 'structured' | 'coach'
  goal: string; // 'grade' | 'project' | 'technique' | 'fingers' | ...
  goals: string[]; // ['grade', 'technique', 'other']
  goalDescription: string;
  project: string; // "La Catrina 5.12a en El Salto"
  projectDescription: string;
  sessionDuration: number; // minutes available per training session
  availableDays: string[]; // ['monday', 'wednesday', ...]
  sleepQuality: string;
  energyLevel: string;
  injuryDescription: string;
  trainingHistory: string;
  planDuration: number; // 4 | 8 | 12
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

  return {
    ...profile,
    goal: legacyGoal || goals[0] || 'other',
    goals,
    goalDescription: typeof profile.goalDescription === 'string' ? profile.goalDescription : '',
    project,
    projectDescription: project,
    sessionDuration:
      typeof profile.sessionDuration === 'number' && profile.sessionDuration > 0
        ? profile.sessionDuration
        : 90,
    availableDays: Array.isArray(profile.availableDays) ? profile.availableDays : [],
    sleepQuality: sleep,
    energyLevel: energy,
    injuryNotes,
    injuryDescription: injuryNotes,
    previousTraining,
    trainingHistory: previousTraining
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
