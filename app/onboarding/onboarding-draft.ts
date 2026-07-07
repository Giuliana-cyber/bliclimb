// Helpers puros del draft de onboarding — se importan desde page.tsx y
// desde el test unitario. Viven aparte para que el test no tenga que
// parsear el TSX del componente completo.
//
// Reglas:
//   - Cada draft se guarda con una key atada al `session.id` del usuario
//     actual (ver loadLocalSession). Sin sesión, no autosaveamos.
//   - Silencioso ante errores de storage (quota, modo privado, JSON
//     corrupto) — el draft es best-effort y no puede romper el form.

import type { UserProfile } from '@/lib/profile';

type DurationChoice = '' | '2' | '3' | '4' | 'starter';

export type OnboardingForm = {
  character: UserProfile['character'];
  name: string;
  age: string;
  sex: string;
  weight: string;
  height: string;
  climbingTime: string;
  disciplines: string[];
  level: string;
  setting: string;
  injuries: string[];
  injuryNotes: string;
  warmup: string;
  sleep: string;
  energy: string;
  daysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  maxSessionDuration: number;
  equipment: string[];
  equipmentNotes: string;
  previousTraining: string;
  pullUpAbility: string;
  fingerTrainingExperience: string;
  campusExperience: string;
  currentFingerPain: number;
  currentShoulderPain: number;
  currentElbowPain: number;
  trainingAggressiveness: string;
  outdoorFrequency: string;
  pullupsBodyweight: string;
  pullupsAddedWeight5Reps: string;
  hangboard20mmSeconds: string;
  hangboard20mmAddedWeight7s: string;
  benchPress1Rm: string;
  squat1Rm: string;
  deadlift1Rm: string;
  goals: string[];
  goalDescription: string;
  project: string;
  rockProjectDescription: string;
  durationChoice: DurationChoice;
};

export const initialForm: OnboardingForm = {
  character: 'bill',
  name: '',
  age: '',
  sex: '',
  weight: '',
  height: '',
  climbingTime: '',
  disciplines: [],
  level: '',
  setting: '',
  injuries: [],
  injuryNotes: '',
  warmup: '',
  sleep: '',
  energy: '',
  daysPerWeek: 0,
  availableDays: [],
  sessionDuration: 90,
  maxSessionDuration: 90,
  equipment: [],
  equipmentNotes: '',
  previousTraining: '',
  pullUpAbility: '',
  fingerTrainingExperience: '',
  campusExperience: '',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  trainingAggressiveness: 'balanced',
  outdoorFrequency: '',
  pullupsBodyweight: '',
  pullupsAddedWeight5Reps: '',
  hangboard20mmSeconds: '',
  hangboard20mmAddedWeight7s: '',
  benchPress1Rm: '',
  squat1Rm: '',
  deadlift1Rm: '',
  goals: [],
  goalDescription: '',
  project: '',
  rockProjectDescription: '',
  durationChoice: ''
};

export const ONBOARDING_DRAFT_KEY_PREFIX = 'bilclimb:onboarding-draft:';
export const ONBOARDING_DRAFT_DEBOUNCE_MS = 400;

export function draftKeyFor(ownerId: string) {
  return `${ONBOARDING_DRAFT_KEY_PREFIX}${ownerId}`;
}

export function readDraft(ownerId: string): Partial<OnboardingForm> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKeyFor(ownerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<OnboardingForm>;
  } catch {
    return null;
  }
}

export function writeDraft(ownerId: string, form: OnboardingForm) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(draftKeyFor(ownerId), JSON.stringify(form));
  } catch {
    // Quota o modo privado — el draft es best-effort, no bloqueamos el form.
  }
}

export function clearDraft(ownerId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKeyFor(ownerId));
  } catch {
    // ignore
  }
}
