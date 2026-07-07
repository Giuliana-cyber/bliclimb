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

// Bloque 4 audit-360: recortes aprobados por Giuliana.
// OUT: height, warmup, energy, previousTraining, campusExperience,
// outdoorFrequency, benchPress1Rm, squat1Rm, deadlift1Rm, project,
// rockProjectDescription. `goalDescription` sobrevive como textarea única.
export type OnboardingForm = {
  character: UserProfile['character'];
  name: string;
  age: string;
  sex: string;
  weight: string;
  climbingTime: string;
  disciplines: string[];
  level: string;
  setting: string;
  injuries: string[];
  injuryNotes: string;
  sleep: string;
  // Bloque 3 audit-360 (H-03): dos campos separados en lugar de un solo
  // "daysPerWeek". `daysPerWeek` se sigue derivando como suma en handleSubmit
  // para no romper el motor ni el schema server. El desglose viaja aparte al
  // prompt de generación (ver profileToPrompt).
  climbingDaysPerWeek: number;
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  maxSessionDuration: number;
  equipment: string[];
  equipmentNotes: string;
  pullUpAbility: string;
  fingerTrainingExperience: string;
  currentFingerPain: number;
  currentShoulderPain: number;
  currentElbowPain: number;
  trainingAggressiveness: string;
  pullupsBodyweight: string;
  pullupsAddedWeight5Reps: string;
  hangboard20mmSeconds: string;
  hangboard20mmAddedWeight7s: string;
  goals: string[];
  goalDescription: string;
  durationChoice: DurationChoice;
};

export const initialForm: OnboardingForm = {
  character: 'bill',
  name: '',
  age: '',
  sex: '',
  weight: '',
  climbingTime: '',
  disciplines: [],
  level: '',
  setting: '',
  injuries: [],
  injuryNotes: '',
  sleep: '',
  climbingDaysPerWeek: 0,
  trainingDaysPerWeek: 0,
  availableDays: [],
  sessionDuration: 90,
  maxSessionDuration: 90,
  equipment: [],
  equipmentNotes: '',
  pullUpAbility: '',
  fingerTrainingExperience: '',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  trainingAggressiveness: 'balanced',
  pullupsBodyweight: '',
  pullupsAddedWeight5Reps: '',
  hangboard20mmSeconds: '',
  hangboard20mmAddedWeight7s: '',
  goals: [],
  goalDescription: '',
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
