import { z } from 'zod';

export const ManualActivitySchema = z.object({
  title: z.string(),
  location: z.string(),
  durationMinutes: z.number().nullable(),
  details: z.string(),
  customizedPlan: z.boolean()
});

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
  notes: z.string(),
  manualActivity: ManualActivitySchema.nullable()
});

export const ExerciseSchema = z.object({
  name: z.string().min(6),
  description: z.string().min(120),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  notes: z.string().min(40).nullable(),
  timerSeconds: z.number().nullable(),
  objective: z.string().nullable(),
  duration: z.string().nullable(),
  intensityPercent: z.string().nullable(),
  tempo: z.string().nullable(),
  howTo: z.array(z.string()).nullable(),
  feelCues: z.array(z.string()).nullable(),
  commonMistakes: z.array(z.string()).nullable(),
  stopIf: z.array(z.string()).nullable(),
  regressions: z.array(z.string()).nullable(),
  progressions: z.array(z.string()).nullable(),
  videoUrl: z.string().nullable(),
  sourceConcept: z.string().nullable(),
  riskLevel: z.enum(['bajo', 'medio', 'alto']).nullable(),
  alternative: z.string().nullable(),
  equipment: z.string().nullable()
});

export const SessionSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  location: z.string(),
  estimatedMinutes: z.number(),
  objective: z.string().min(20),
  why: z.string().min(40),
  intensityTarget: z.string().min(8),
  warmup: z.array(ExerciseSchema).min(3),
  warmupGeneral: z.array(ExerciseSchema).min(2),
  warmupSpecific: z.array(ExerciseSchema).min(2),
  mainBlock: z.array(ExerciseSchema).min(3),
  finalBlock: z.array(ExerciseSchema).min(1),
  cooldown: z.array(ExerciseSchema).min(2),
  safetyNotes: z.array(z.string()).min(2),
  adjustmentRules: z.array(z.string()).min(2),
  successCriteria: z.array(z.string()).min(2),
  nutritionTip: z.string().min(40),
  source: z.string(),
  completed: z.boolean(),
  checkIn: CheckInSchema.nullable()
});

export const WeekSchema = z.object({
  weekNumber: z.number(),
  theme: z.string(),
  focusAreas: z.array(z.string()),
  microcycle: z.string().nullable(),
  progression: z.string().nullable(),
  deloadFocus: z.string().nullable(),
  sessions: z.array(SessionSchema)
});

export const TrainingPlanSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  objective: z.string(),
  mesocycleType: z.string().min(8),
  mainObjective: z.string().min(20),
  secondaryObjectives: z.array(z.string()).min(1),
  athleteSummary: z.string().min(40),
  riskSummary: z.string().min(30),
  equipmentSummary: z.string().min(20),
  weeklyFeedbackPrompt: z.string().min(30),
  recoveryGuidelines: z.array(z.string()).min(2),
  safetyRules: z.array(z.string()).min(2),
  totalWeeks: z.number(),
  currentWeek: z.number(),
  startDate: z.string(),
  weeks: z.array(WeekSchema),
  status: z.enum(['active', 'completed', 'paused']),
  createdAt: z.string(),
  usedFileSearch: z.boolean().nullable(),
  librarySources: z.array(z.string()).nullable()
});
