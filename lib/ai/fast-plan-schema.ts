import { z } from 'zod';

export const FastExerciseSchema = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  notes: z.string().nullable(),
  alternative: z.string().nullable(),
  equipment: z.string().nullable()
});

export const FastSessionSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  location: z.string(),
  estimatedMinutes: z.number(),
  objective: z.string(),
  why: z.string(),
  intensityTarget: z.string(),
  warmup: z.array(FastExerciseSchema),
  mainBlock: z.array(FastExerciseSchema),
  cooldown: z.array(FastExerciseSchema),
  safetyNotes: z.array(z.string()),
  adjustmentRules: z.array(z.string()),
  successCriteria: z.array(z.string()),
  nutritionTip: z.string(),
  source: z.string()
});

export const FastWeekSchema = z.object({
  weekNumber: z.number(),
  theme: z.string(),
  objective: z.string(),
  focusAreas: z.array(z.string()),
  loadLevel: z.string(),
  deloadWeek: z.boolean(),
  sessions: z.array(FastSessionSchema)
});

export const FastPlanMetadataSchema = z.object({
  objective: z.string(),
  mainObjective: z.string(),
  secondaryObjectives: z.array(z.string()),
  athleteSummary: z.string(),
  riskSummary: z.string(),
  equipmentSummary: z.string(),
  mesocycleType: z.string(),
  progressionModel: z.string(),
  weeklyFeedbackPrompt: z.string(),
  recoveryGuidelines: z.array(z.string()),
  safetyRules: z.array(z.string()),
  weekThemes: z.array(
    z.object({
      weekNumber: z.number(),
      theme: z.string(),
      objective: z.string(),
      focusAreas: z.array(z.string()),
      loadLevel: z.string(),
      deloadWeek: z.boolean()
    })
  )
});

export type FastPlanMetadata = z.infer<typeof FastPlanMetadataSchema>;
export type FastWeek = z.infer<typeof FastWeekSchema>;
export type FastSession = z.infer<typeof FastSessionSchema>;
export type FastExercise = z.infer<typeof FastExerciseSchema>;
