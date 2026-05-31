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
  category: z.string().nullable(),
  requiredEquipment: z.array(z.string()).nullable(),
  riskLevel: z.enum(['bajo', 'medio', 'alto']).nullable(),
  objective: z.string().nullable(),
  prescription: z.string().nullable(),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  duration: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  intensityPercent: z.string().nullable(),
  rpeTarget: z.string().nullable(),
  tempo: z.string().nullable(),
  notes: z.string().min(40).nullable(),
  timerSeconds: z.number().nullable(),
  howTo: z.array(z.string()).nullable(),
  feelCues: z.array(z.string()).nullable(),
  commonMistakes: z.array(z.string()).nullable(),
  stopIf: z.array(z.string()).nullable(),
  regressions: z.array(z.string()).nullable(),
  progressions: z.array(z.string()).nullable(),
  videoUrl: z.string().nullable(),
  sourceConcept: z.string().nullable(),
  alternative: z.string().nullable(),
  equipment: z.string().nullable()
});

export const SessionSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  stimulusType: z.string().nullable(),
  location: z.string(),
  equipment: z.array(z.string()).nullable(),
  estimatedMinutes: z.number(),
  estimatedDurationMinutes: z.number().nullable(),
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
  microcycleId: z.string().nullable(),
  theme: z.string(),
  objective: z.string().nullable(),
  focusAreas: z.array(z.string()),
  microcycle: z.string().nullable(),
  progression: z.string().nullable(),
  progressionFocus: z.string().nullable(),
  loadLevel: z.string().nullable(),
  deloadWeek: z.boolean().nullable(),
  deloadFocus: z.string().nullable(),
  sessions: z.array(SessionSchema)
});

export const MicrocycleSchema = z.object({
  id: z.string(),
  weeks: z.array(z.number()),
  objective: z.string(),
  loadLevel: z.string(),
  progressionFocus: z.string(),
  deloadWeek: z.boolean()
});

export const PlanQualityScoresSchema = z.object({
  variationScore: z.number(),
  progressionScore: z.number(),
  safetyScore: z.number(),
  specificityScore: z.number(),
  equipmentFitScore: z.number(),
  professionalStructureScore: z.number()
});

export const TrainingPlanSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  planVersion: z.string().nullable(),
  objective: z.string(),
  mesocycleType: z.string().min(8),
  microcycles: z.array(MicrocycleSchema).nullable(),
  planningRationale: z.string().nullable(),
  mainObjective: z.string().min(20),
  secondaryObjectives: z.array(z.string()).min(1),
  athleteSummary: z.string().min(40),
  riskSummary: z.string().min(30),
  equipmentSummary: z.string().min(20),
  progressionModel: z.string().nullable(),
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
  librarySources: z.array(z.string()).nullable(),
  qualityScores: PlanQualityScoresSchema.nullable()
});
