import { z } from 'zod';

/**
 * Schema servidor del UserProfile que llega en el body de /api/generate-plan.
 *
 * No usa los enums "duros" del onboarding (ej. 'u16' | '16-25' | ...) sino
 * `z.string().min(1)` porque el servidor no debería rechazar perfiles antiguos
 * que se generaron con valores ahora obsoletos. Lo importante es que los
 * campos requeridos por la generación existan y tengan el tipo correcto.
 *
 * Solo los campos que el plan realmente consume son `min(1)` o numéricos.
 * El resto se acepta vacío o nullable para no romper compatibilidad con
 * perfiles que vienen de localStorage de versiones previas.
 */
export const UserProfileSchema = z.object({
  id: z.string().min(1),
  character: z.enum(['bill', 'senda']),
  name: z.string(),
  age: z.string(),
  sex: z.string().optional().default(''),
  weight: z.number().nullable().optional().default(null),
  height: z.number().nullable().optional().default(null),
  climbingTime: z.string().min(1),
  disciplines: z.array(z.string()).optional().default([]),
  level: z.string().optional().default(''),
  setting: z.string().optional().default(''),
  injuries: z.array(z.string()).optional().default([]),
  injuryNotes: z.string().optional().default(''),
  warmup: z.string().optional().default(''),
  sleep: z.string().optional().default(''),
  energy: z.string().optional().default(''),
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.array(z.string()).optional().default([]),
  equipmentNotes: z.string().optional().default(''),
  previousTraining: z.string().optional().default(''),
  goal: z.string().optional().default(''),
  goals: z.array(z.string()).optional().default([]),
  goalDescription: z.string().optional().default(''),
  project: z.string().optional().default(''),
  projectDescription: z.string().optional().default(''),
  sessionDuration: z.number().int().min(15).max(360).optional().default(90),
  maxSessionDuration: z.number().int().min(15).max(360).optional().default(120),
  availableDays: z.array(z.string()).optional().default([]),
  accessToCampusBoard: z.boolean().optional().default(false),
  accessToHangboard: z.boolean().optional().default(false),
  accessToTRX: z.boolean().optional().default(false),
  accessToWeights: z.boolean().optional().default(false),
  pullUpAbility: z.string().optional().default(''),
  fingerTrainingExperience: z.string().optional().default(''),
  campusExperience: z.string().optional().default(''),
  currentFingerPain: z.number().min(0).max(10).optional().default(0),
  currentShoulderPain: z.number().min(0).max(10).optional().default(0),
  currentElbowPain: z.number().min(0).max(10).optional().default(0),
  wantsConservativePlan: z.boolean().optional().default(false),
  trainingAggressiveness: z.string().optional().default('balanced'),
  outdoorFrequency: z.string().optional().default(''),
  rockProjectDescription: z.string().optional().default(''),
  sleepQuality: z.string().optional().default(''),
  energyLevel: z.string().optional().default(''),
  injuryDescription: z.string().optional().default(''),
  trainingHistory: z.string().optional().default(''),
  planDuration: z.number().int().refine((n) => n === 4 || n === 8 || n === 12, {
    message: 'planDuration debe ser 4, 8 o 12 semanas'
  }),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;

/**
 * Schema del body de /api/chat. No validamos el perfil completo aquí — solo
 * los mensajes (que es el campo que el endpoint *realmente* consume y donde
 * un payload malformado revienta el llamado a OpenAI).
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1)
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  profile: z.unknown().optional(),
  character: z.enum(['bill', 'senda']).optional(),
  plan: z.unknown().optional(),
  checkIns: z.array(z.unknown()).optional()
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
