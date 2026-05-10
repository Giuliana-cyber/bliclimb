import { z } from 'zod';

export const CheckInSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  planId: z.string(),
  date: z.string(),
  completed: z.enum(['full', 'partial', 'skipped']),
  rpe: z.number(),
  fingerPain: z.number(),
  otherPain: z.array(z.string()),
  energy: z.number(),
  sleep: z.number(),
  notes: z.string()
});

export const ExerciseSchema = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  notes: z.string().nullable(),
  timerSeconds: z.number().nullable()
});

export const SessionSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  location: z.string(),
  estimatedMinutes: z.number(),
  warmup: z.array(ExerciseSchema),
  mainBlock: z.array(ExerciseSchema),
  cooldown: z.array(ExerciseSchema),
  nutritionTip: z.string(),
  source: z.string(),
  completed: z.boolean(),
  checkIn: CheckInSchema.nullable()
});

export const WeekSchema = z.object({
  weekNumber: z.number(),
  theme: z.string(),
  focusAreas: z.array(z.string()),
  sessions: z.array(SessionSchema)
});

export const TrainingPlanSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  objective: z.string(),
  totalWeeks: z.number(),
  currentWeek: z.number(),
  startDate: z.string(),
  weeks: z.array(WeekSchema),
  status: z.enum(['active', 'completed', 'paused']),
  createdAt: z.string()
});
