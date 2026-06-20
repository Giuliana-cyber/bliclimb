// Shape del `coach_plans.plan_data` (jsonb) que el editor del coach maneja
// y que al publicarse se materializa en public.plans + public.sessions —
// idéntica estructura al `TrainingPlan` que usa la UI del cliente.
import { z } from 'zod';

// Editor MVP: solo los campos mínimos necesarios para que la app del cliente
// renderice el plan con su UI actual (timeline, sesión, check-in). El resto
// de campos opcionales (microcycles, qualityScores, etc.) se omiten — el
// código consumidor ya maneja nullable en esos casos.

export const CoachExerciseSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  sets: z.number().int().min(0).max(20).nullable(),
  reps: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  notes: z.string().nullable()
});

export const CoachSessionSchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  title: z.string().min(1, 'Título de sesión requerido'),
  location: z.string().min(1, 'Lugar requerido'),
  estimatedMinutes: z.number().int().min(5).max(360),
  objective: z.string().nullable(),
  intensityTarget: z.string().nullable(),
  warmup: z.array(CoachExerciseSchema).default([]),
  mainBlock: z.array(CoachExerciseSchema).default([]),
  cooldown: z.array(CoachExerciseSchema).default([])
});

export const CoachWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(12),
  theme: z.string().min(1, 'Título de semana requerido'),
  objective: z.string().nullable(),
  sessions: z.array(CoachSessionSchema).default([])
});

export const CoachPlanDataSchema = z.object({
  weeks: z.array(CoachWeekSchema).default([])
});

export type CoachExercise = z.infer<typeof CoachExerciseSchema>;
export type CoachSession = z.infer<typeof CoachSessionSchema>;
export type CoachWeek = z.infer<typeof CoachWeekSchema>;
export type CoachPlanData = z.infer<typeof CoachPlanDataSchema>;

export function emptyExercise(): CoachExercise {
  return { name: '', sets: null, reps: null, rest: null, intensity: null, notes: null };
}

export function emptySession(dayNumber: number): CoachSession {
  return {
    dayNumber,
    title: '',
    location: 'gym',
    estimatedMinutes: 60,
    objective: null,
    intensityTarget: null,
    warmup: [],
    mainBlock: [],
    cooldown: []
  };
}

export function emptyWeek(weekNumber: number): CoachWeek {
  return {
    weekNumber,
    theme: `Semana ${weekNumber}`,
    objective: null,
    sessions: []
  };
}

export function emptyPlanData(durationWeeks: number): CoachPlanData {
  return {
    weeks: Array.from({ length: durationWeeks }, (_, i) => emptyWeek(i + 1))
  };
}
