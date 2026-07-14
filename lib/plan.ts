import type { CheckIn } from '@/lib/checkin';
import { normalizePlanLanguage } from '@/lib/plan-language';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

const PLAN_STORAGE_KEY = 'bilclimb:plan';

export interface TrainingPlan {
  id: string;
  profileId: string;
  planVersion?: string | null;
  objective: string;
  mesocycleType?: string | null;
  microcycles?: Microcycle[] | null;
  planningRationale?: string | null;
  mainObjective?: string | null;
  secondaryObjectives?: string[] | null;
  athleteSummary?: string | null;
  riskSummary?: string | null;
  equipmentSummary?: string | null;
  progressionModel?: string | null;
  weeklyFeedbackPrompt?: string | null;
  recoveryGuidelines?: string[] | null;
  safetyRules?: string[] | null;
  totalWeeks: number;
  currentWeek: number;
  startDate: string;
  weeks: Week[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  usedFileSearch?: boolean | null;
  librarySources?: string[] | null;
  qualityScores?: PlanQualityScores | null;
}

export interface Microcycle {
  id: string;
  weeks: number[];
  objective: string;
  loadLevel: string;
  progressionFocus: string;
  deloadWeek: boolean;
}

export interface PlanQualityScores {
  variationScore: number;
  progressionScore: number;
  safetyScore: number;
  specificityScore: number;
  equipmentFitScore: number;
  professionalStructureScore: number;
}

export interface Week {
  weekNumber: number;
  microcycleId?: string | null;
  theme: string; // "Diagnóstico + base"
  objective?: string | null;
  focusAreas: string[]; // ["fuerza dedos", "técnica"]
  microcycle?: string | null;
  progression?: string | null;
  progressionFocus?: string | null;
  loadLevel?: string | null;
  deloadWeek?: boolean | null;
  deloadFocus?: string | null;
  // Sub-fase 4 base — phase estructurada para reglas §3.7/§3.8. Opcional
  // en runtime type para compat con planes viejos (permisivo por defecto:
  // el validador skipeará reglas que dependan de phase si viene ausente).
  phase?: 'base' | 'build' | 'peak' | 'deload' | 'test' | null;
  sessions: Session[];
}

export interface Session {
  dayNumber: number; // 1, 2, 3 dentro de la semana
  title: string; // "Hangboard + técnica"
  stimulusType?: string | null;
  // Sub-fase 4 base — categoría dominante estructurada.
  // Consumida por reglas §3.1/§3.2/§3.6/§3.9/§3.10. Opcional para compat.
  stimulusCategory?:
    | 'warmup'
    | 'skill'
    | 'strength'
    | 'power'
    | 'power-endurance'
    | 'aerobic-base'
    | 'mobility'
    | 'mental'
    | 'cooldown'
    | 'rest'
    | null;
  // Sub-fase 4 base — RPE bucket. Consumido por §3.10.
  intensityLevel?: 'easy' | 'medium' | 'hard' | null;
  location: string; // "gym" | "casa" | "roca"
  equipment?: string[] | null;
  estimatedMinutes: number;
  estimatedDurationMinutes?: number | null;
  objective?: string | null;
  why?: string | null;
  intensityTarget?: string | null;
  warmup: Exercise[];
  warmupGeneral?: Exercise[] | null;
  warmupSpecific?: Exercise[] | null;
  mainBlock: Exercise[];
  finalBlock?: Exercise[] | null;
  cooldown: Exercise[];
  safetyNotes?: string[] | null;
  adjustmentRules?: string[] | null;
  successCriteria?: string[] | null;
  nutritionTip: string;
  source: string; // "Eva López - MaxHangs"
  completed: boolean;
  checkIn: CheckIn | null;
}

export interface Exercise {
  name: string;
  description: string;
  category?: string | null;
  requiredEquipment?: string[] | null;
  riskLevel?: 'bajo' | 'medio' | 'alto' | null;
  // Sub-fase 4 — categoría de estímulo per-exercise (misma taxonomía que
  // Session.stimulusCategory). Opcional/nullable para compat con ejercicios
  // de planes viejos generados antes del schema extendido — el validador
  // §3.x salta reglas dependientes cuando el campo viene ausente.
  stimulusCategory?:
    | 'warmup'
    | 'skill'
    | 'strength'
    | 'power'
    | 'power-endurance'
    | 'aerobic-base'
    | 'mobility'
    | 'mental'
    | 'cooldown'
    | 'rest'
    | null;
  // Sub-fase final del middleware — categoría gateable. Cruza con
  // BlockingContext del perfil (§1.x). Opcional/nullable para compat con
  // planes viejos (validador skipeará ejercicios sin la etiqueta).
  blockCategory?:
    | 'hangboard'
    | 'hangboard-intense'
    | 'campus'
    | 'full-crimp'
    | 'hit'
    | 'pullups-weighted'
    | 'max-tests'
    | 'finger-training-any'
    | 'power-max'    // Deuda #10 · potencia máxima con contact strength
    | null;
  objective?: string | null;
  prescription?: string | null;
  sets: number | null;
  reps: string | null; // "10 seg" | "8 reps" | "4-6 problemas"
  duration?: string | null;
  rest: string | null; // "3 min" | "1 min"
  intensity: string | null; // "BW" | "+5%" | "2 grados debajo"
  intensityPercent?: string | null;
  rpeTarget?: string | null;
  tempo?: string | null;
  notes: string | null;
  timerSeconds: number | null; // Para activar timer
  howTo?: string[] | null;
  feelCues?: string[] | null;
  commonMistakes?: string[] | null;
  stopIf?: string[] | null;
  regressions?: string[] | null;
  progressions?: string[] | null;
  videoUrl?: string | null;
  sourceConcept?: string | null;
  alternative?: string | null;
  equipment?: string | null;
}

export function loadTrainingPlan() {
  const plan = readStorage<TrainingPlan | null>(PLAN_STORAGE_KEY, null);

  if (!plan) {
    return null;
  }

  const normalizedPlan = normalizePlanLanguage(plan);

  if (JSON.stringify(normalizedPlan) !== JSON.stringify(plan)) {
    writeStorage(PLAN_STORAGE_KEY, normalizedPlan);
  }

  return normalizedPlan;
}

export function saveTrainingPlan(plan: TrainingPlan) {
  const normalizedPlan = normalizePlanLanguage(plan);
  writeStorage(PLAN_STORAGE_KEY, normalizedPlan);
  return normalizedPlan;
}

export function updateTrainingPlan(updates: Partial<TrainingPlan>) {
  const currentPlan = loadTrainingPlan();

  if (!currentPlan) {
    return null;
  }

  const nextPlan: TrainingPlan = {
    ...currentPlan,
    ...updates
  };

  saveTrainingPlan(nextPlan);
  return nextPlan;
}

export function clearTrainingPlan() {
  removeStorage(PLAN_STORAGE_KEY);
}

export function saveSessionCheckIn({
  weekNumber,
  dayNumber,
  checkIn
}: {
  weekNumber: number;
  dayNumber: number;
  checkIn: CheckIn;
}) {
  const currentPlan = loadTrainingPlan();

  if (!currentPlan || currentPlan.id !== checkIn.planId) {
    return null;
  }

  const nextPlan: TrainingPlan = {
    ...currentPlan,
    weeks: currentPlan.weeks.map((week) => {
      if (week.weekNumber !== weekNumber) {
        return week;
      }

      return {
        ...week,
        sessions: week.sessions.map((session) => {
          if (session.dayNumber !== dayNumber) {
            return session;
          }

          return {
            ...session,
            completed: checkIn.completed !== 'skipped',
            checkIn
          };
        })
      };
    })
  };

  saveTrainingPlan(nextPlan);
  return nextPlan;
}
