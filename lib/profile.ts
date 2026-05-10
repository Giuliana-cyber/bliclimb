import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

const PROFILE_STORAGE_KEY = 'bilclimb:profile';

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
  project: string; // "La Catrina 5.12a en El Salto"
  planDuration: number; // 4 | 8 | 12
  createdAt: string;
  updatedAt: string;
}

export function loadProfile() {
  return readStorage<UserProfile | null>(PROFILE_STORAGE_KEY, null);
}

export function saveProfile(profile: UserProfile) {
  writeStorage(PROFILE_STORAGE_KEY, profile);
  return profile;
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
}
