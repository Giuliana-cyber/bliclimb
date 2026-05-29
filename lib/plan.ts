import type { CheckIn } from '@/lib/checkin';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

const PLAN_STORAGE_KEY = 'bilclimb:plan';

export interface TrainingPlan {
  id: string;
  profileId: string;
  objective: string;
  totalWeeks: number;
  currentWeek: number;
  startDate: string;
  weeks: Week[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  usedFileSearch?: boolean;
  librarySources?: string[];
}

export interface Week {
  weekNumber: number;
  theme: string; // "Diagnóstico + base"
  focusAreas: string[]; // ["fuerza dedos", "técnica"]
  sessions: Session[];
}

export interface Session {
  dayNumber: number; // 1, 2, 3 dentro de la semana
  title: string; // "Hangboard + técnica"
  location: string; // "gym" | "casa" | "roca"
  estimatedMinutes: number;
  warmup: Exercise[];
  mainBlock: Exercise[];
  cooldown: Exercise[];
  nutritionTip: string;
  source: string; // "Eva López - MaxHangs"
  completed: boolean;
  checkIn: CheckIn | null;
}

export interface Exercise {
  name: string;
  description: string;
  sets: number | null;
  reps: string | null; // "10 seg" | "8 reps" | "4-6 problemas"
  rest: string | null; // "3 min" | "1 min"
  intensity: string | null; // "BW" | "+5%" | "2 grados debajo"
  notes: string | null;
  timerSeconds: number | null; // Para activar timer
}

export function loadTrainingPlan() {
  return readStorage<TrainingPlan | null>(PLAN_STORAGE_KEY, null);
}

export function saveTrainingPlan(plan: TrainingPlan) {
  writeStorage(PLAN_STORAGE_KEY, plan);
  return plan;
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
