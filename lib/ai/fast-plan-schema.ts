import { z } from 'zod';

// -------------------- Enums de estructura del plan (sub-fase 4 base) --------------------
//
// Estos enums fuerzan al LLM a devolver estructura verificable en vez de
// texto libre. Son la base sobre la que corre el validador de las 11
// reglas de programación de sub-fase 4. Descripciones concisas viven en
// el prompt (METADATA_PROMPT / WEEK_PROMPT), NO acá.

/**
 * Fase del microciclo dentro del mesociclo. Aplica a `week.phase`.
 *   - 'base'   → fundamentos, alta variedad, volumen moderado
 *   - 'build'  → progresión, especificidad creciente, volumen alto
 *   - 'peak'   → intensidad máxima, volumen reducido, especificidad total
 *   - 'deload' → descarga programada (~50% volumen). Coexiste con
 *                `deloadWeek: true` — se mantienen los dos por compat.
 *   - 'test'   → semana de evaluación (max hangs, tests)
 */
export const WeekPhaseSchema = z.enum(['base', 'build', 'peak', 'deload', 'test']);
export type WeekPhase = z.infer<typeof WeekPhaseSchema>;

/**
 * Categoría dominante de estímulo de la sesión. Aplica a `session.stimulusCategory`.
 * Taxonomía consensuada 2026-07-06 (fase-3-subfase-4).
 *   - 'warmup'          → sesión entera de activación/preparación
 *   - 'skill'           → técnica/movimiento (drills, boulder de estilo)
 *   - 'strength'        → fuerza máxima (max hangs, dominadas con lastre pesadas)
 *   - 'power'           → explosividad (5-7 movs con descanso completo, campus, dinámicos)
 *   - 'power-endurance' → circuitos 30 movs / 45s-5min con recuperación incompleta
 *   - 'aerobic-base'    → ARC (baja intensidad continua) + Aero Cap (bomba controlable)
 *   - 'mobility'        → movilidad, flexibilidad
 *   - 'mental'          → visualización, foco, rutina pre-escalada, gestión del miedo
 *   - 'cooldown'        → sesión entera de vuelta a la calma / recuperación pasiva
 *   - 'rest'            → día off o recovery activo suave (yoga restorativo, caminar).
 *                         Distinto de 'deload' que modifica SEMANAS.
 */
export const StimulusCategorySchema = z.enum([
  'warmup',
  'skill',
  'strength',
  'power',
  'power-endurance',
  'aerobic-base',
  'mobility',
  'mental',
  'cooldown',
  'rest'
]);
export type StimulusCategory = z.infer<typeof StimulusCategorySchema>;

/**
 * Intensidad global de la sesión. Aplica a `session.intensityLevel`.
 * Consumido por 3.10 (max 3 días duros / semana).
 *   - 'easy'   → RPE ≤5, recuperación activa, aeróbico base suave
 *   - 'medium' → RPE 6-7, trabajo aeróbico moderado, técnica bajo carga
 *   - 'hard'   → RPE ≥8, sesiones intensas (§3.10)
 */
export const IntensityLevelSchema = z.enum(['easy', 'medium', 'hard']);
export type IntensityLevel = z.infer<typeof IntensityLevelSchema>;

/**
 * Nivel de riesgo del ejercicio. Aplica a `exercise.riskLevel`.
 * Ya existía en lib/plan.ts como enum pero NO estaba en el schema Zod —
 * el LLM nunca lo rellenaba. Este PR cierra ese bug latente.
 */
export const RiskLevelSchema = z.enum(['bajo', 'medio', 'alto']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * Categoría gateable del ejercicio para cruce con §1.x del middleware.
 * Debe alinearse SIEMPRE con `BlockedCategory` en `lib/brain/types.ts`
 * — cualquier valor nuevo se agrega en ambos lados a la vez.
 * `null` cuando el ejercicio no encaja en ninguna categoría gateable
 * (ej: silent feet drill, foam roll, respiración).
 */
export const BlockCategorySchema = z.enum([
  'hangboard',
  'hangboard-intense',
  'campus',
  'full-crimp',
  'hit',
  'pullups-weighted',
  'max-tests',
  'finger-training-any'
]);
export type BlockCategory = z.infer<typeof BlockCategorySchema>;

// -------------------- Schemas (con los enums) --------------------

export const FastExerciseSchema = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest: z.string().nullable(),
  intensity: z.string().nullable(),
  notes: z.string().nullable(),
  alternative: z.string().nullable(),
  equipment: z.string().nullable(),
  riskLevel: RiskLevelSchema,
  // Sub-fase 4 — categoría de estímulo per-exercise. Misma taxonomía que
  // FastSession.stimulusCategory pero aplicada al ejercicio individual.
  // Habilita reglas §3.1 (orden intra-sesión), §3.2 (skills primeros 30 min),
  // §3.6 (hangboard antes de escalar), §3.20 (max 2 elementos alta intensidad)
  // sin string matching. Un ejercicio con name="Hangboard 20mm" viene con
  // stimulusCategory='strength'; el validador filtra por enum, no por texto.
  stimulusCategory: StimulusCategorySchema,
  // Sub-fase final del middleware — categoría gateable per-exercise.
  // Cruza con `BlockingContext.blockedCategories` (emitida por §1.x del
  // perfil) en `section01PlanGating`. El LLM etiqueta con el enum o
  // `null` si el ejercicio no cae en ninguna categoría gateable
  // (silent feet drill, foam roll, respiración = null).
  blockCategory: BlockCategorySchema.nullable(),
  // Instrucciones técnicas reales — el modelo DEBE rellenarlos. Si vienen
  // vacíos la UI muestra vacío (no rompe). El prompt en WEEK_PROMPT pide
  // 3-5 pasos para howTo, 2-3 para cues, 1-2 para commonMistakes.
  howTo: z.array(z.string()),
  cues: z.array(z.string()),
  commonMistakes: z.array(z.string())
});

// -------------------- Schemas restringidos por bloque (Opción 6 audit-360) --------------------
//
// Sub-fase Opción 6 · fix bug #2: restringimos qué stimulusCategory puede
// aparecer en cada bloque físico del OpenAI structured output. Con esto
// §3.6 (hangboard NUNCA en warmup ni cooldown) queda garantizada por
// construcción — es imposible que OpenAI devuelva un JSON donde un
// exercise con stimulusCategory='strength' aparezca en el array warmup.
//
// Los otros schemas (FastExerciseSchema base) siguen existiendo para
// código downstream (chat runtime, coach panel) que no necesita esta
// restricción — solo la usa el motor de generación.

/** Stimulus permitidos en el bloque warmup (§3.6). */
export const WarmupStimulusSchema = z.enum(['warmup', 'mobility', 'skill']);
export type WarmupStimulus = z.infer<typeof WarmupStimulusSchema>;

/** Stimulus permitidos en el bloque mainBlock (§3.6). Cubre todo lo cargable. */
export const MainBlockStimulusSchema = z.enum([
  'skill',
  'strength',
  'power',
  'power-endurance',
  'aerobic-base',
  'mobility'
]);
export type MainBlockStimulus = z.infer<typeof MainBlockStimulusSchema>;

/** Stimulus permitidos en el bloque cooldown (§3.6). */
export const CooldownStimulusSchema = z.enum(['cooldown', 'mobility', 'rest']);
export type CooldownStimulus = z.infer<typeof CooldownStimulusSchema>;

// Variantes del exercise con el campo stimulusCategory restringido por bloque.
// Reusamos FastExerciseSchema con omit+extend para no duplicar la definición
// completa — cualquier campo nuevo que se agregue a FastExerciseSchema fluye
// automáticamente a las 3 variantes.
export const WarmupExerciseSchema = FastExerciseSchema.omit({
  stimulusCategory: true
}).extend({ stimulusCategory: WarmupStimulusSchema });

export const MainBlockExerciseSchema = FastExerciseSchema.omit({
  stimulusCategory: true
}).extend({ stimulusCategory: MainBlockStimulusSchema });

export const CooldownExerciseSchema = FastExerciseSchema.omit({
  stimulusCategory: true
}).extend({ stimulusCategory: CooldownStimulusSchema });

export type WarmupExercise = z.infer<typeof WarmupExerciseSchema>;
export type MainBlockExercise = z.infer<typeof MainBlockExerciseSchema>;
export type CooldownExercise = z.infer<typeof CooldownExerciseSchema>;

export const FastSessionSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  location: z.string(),
  estimatedMinutes: z.number(),
  objective: z.string(),
  why: z.string(),
  intensityTarget: z.string(),
  stimulusCategory: StimulusCategorySchema,
  intensityLevel: IntensityLevelSchema,
  // Bloque audit-360 fix bug #2: arrays tipados con schemas restringidos.
  warmup: z.array(WarmupExerciseSchema),
  mainBlock: z.array(MainBlockExerciseSchema),
  cooldown: z.array(CooldownExerciseSchema),
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
  phase: WeekPhaseSchema,
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
      deloadWeek: z.boolean(),
      phase: WeekPhaseSchema
    })
  )
});

export type FastPlanMetadata = z.infer<typeof FastPlanMetadataSchema>;
export type FastWeek = z.infer<typeof FastWeekSchema>;
export type FastSession = z.infer<typeof FastSessionSchema>;
export type FastExercise = z.infer<typeof FastExerciseSchema>;
