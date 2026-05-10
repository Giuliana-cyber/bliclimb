import type { CheckIn } from '@/lib/checkin';

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
