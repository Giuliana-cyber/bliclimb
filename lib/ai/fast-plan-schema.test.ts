import { describe, expect, it } from 'vitest';
import {
  FastExerciseSchema,
  FastPlanMetadataSchema,
  FastSessionSchema,
  FastWeekSchema,
  IntensityLevelSchema,
  RiskLevelSchema,
  StimulusCategorySchema,
  WeekPhaseSchema
} from './fast-plan-schema';

// -------------------- Enums exhaustivos --------------------

describe('WeekPhaseSchema — 5 valores fijos', () => {
  it.each(['base', 'build', 'peak', 'deload', 'test'] as const)(
    "acepta '%s'",
    (v) => {
      expect(WeekPhaseSchema.safeParse(v).success).toBe(true);
    }
  );

  it('rechaza cualquier otro valor', () => {
    expect(WeekPhaseSchema.safeParse('recuperación').success).toBe(false);
    expect(WeekPhaseSchema.safeParse('Base').success).toBe(false); // case-sensitive
    expect(WeekPhaseSchema.safeParse('').success).toBe(false);
    expect(WeekPhaseSchema.safeParse(null).success).toBe(false);
  });
});

describe('StimulusCategorySchema — 10 valores fijos (taxonomía sub-fase 4)', () => {
  const values = [
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
  ] as const;

  it.each(values)("acepta '%s'", (v) => {
    expect(StimulusCategorySchema.safeParse(v).success).toBe(true);
  });

  it('el enum tiene exactamente los 10 valores esperados', () => {
    expect(StimulusCategorySchema.options.length).toBe(10);
    for (const v of values) {
      expect(StimulusCategorySchema.options).toContain(v);
    }
  });

  it("rechaza 'aerobic' (renombrado a 'aerobic-base')", () => {
    expect(StimulusCategorySchema.safeParse('aerobic').success).toBe(false);
  });

  it("rechaza 'endurance', 'technique', 'strength-endurance' (no en taxonomía)", () => {
    expect(StimulusCategorySchema.safeParse('endurance').success).toBe(false);
    expect(StimulusCategorySchema.safeParse('technique').success).toBe(false);
    expect(StimulusCategorySchema.safeParse('strength-endurance').success).toBe(false);
  });
});

describe('IntensityLevelSchema — 3 buckets RPE', () => {
  it.each(['easy', 'medium', 'hard'] as const)("acepta '%s'", (v) => {
    expect(IntensityLevelSchema.safeParse(v).success).toBe(true);
  });

  it("rechaza 'moderate', 'baja', 'high'", () => {
    expect(IntensityLevelSchema.safeParse('moderate').success).toBe(false);
    expect(IntensityLevelSchema.safeParse('baja').success).toBe(false);
    expect(IntensityLevelSchema.safeParse('high').success).toBe(false);
  });
});

describe('RiskLevelSchema — español (compat con lib/plan.ts)', () => {
  it.each(['bajo', 'medio', 'alto'] as const)("acepta '%s'", (v) => {
    expect(RiskLevelSchema.safeParse(v).success).toBe(true);
  });

  it("rechaza 'low' / 'high' (evita drift con lib/plan.ts)", () => {
    expect(RiskLevelSchema.safeParse('low').success).toBe(false);
    expect(RiskLevelSchema.safeParse('high').success).toBe(false);
  });
});

// -------------------- Composición: Exercise/Session/Week con enums --------------------

const VALID_EXERCISE = {
  name: 'MaxHang 20mm',
  description: 'Hang máximo controlado',
  sets: 5,
  reps: '10s',
  rest: '3 min',
  intensity: '90% BW',
  notes: null,
  alternative: null,
  equipment: 'hangboard',
  riskLevel: 'alto' as const,
  howTo: ['agarra', 'cuelga', 'baja'],
  cues: ['sentí flexores'],
  commonMistakes: ['no perder técnica en el último segundo']
};

const VALID_SESSION = {
  dayNumber: 1,
  title: 'Día 1 — Fuerza dedos',
  location: 'gym',
  estimatedMinutes: 90,
  objective: 'Trabajar fuerza max',
  why: 'Adaptación tendinosa',
  intensityTarget: 'RPE 8-9',
  stimulusCategory: 'strength' as const,
  intensityLevel: 'hard' as const,
  warmup: [VALID_EXERCISE],
  mainBlock: [VALID_EXERCISE, VALID_EXERCISE, VALID_EXERCISE, VALID_EXERCISE],
  cooldown: [VALID_EXERCISE, VALID_EXERCISE],
  safetyNotes: ['no pasar dolor 3/10'],
  adjustmentRules: ['Si dolor supera 3/10, reducir carga 10%'],
  successCriteria: ['completar 5 series con técnica limpia'],
  nutritionTip: 'Comer 90 min antes',
  source: 'Eric Hörst'
};

describe('FastExerciseSchema — requiere riskLevel obligatorio (bug fix)', () => {
  it('exercise válido pasa', () => {
    expect(FastExerciseSchema.safeParse(VALID_EXERCISE).success).toBe(true);
  });

  it('exercise SIN riskLevel falla (antes pasaba, ahora es required)', () => {
    const { riskLevel: _riskLevel, ...noRisk } = VALID_EXERCISE;
    expect(FastExerciseSchema.safeParse(noRisk).success).toBe(false);
  });

  it("exercise con riskLevel inválido falla", () => {
    expect(
      FastExerciseSchema.safeParse({ ...VALID_EXERCISE, riskLevel: 'medium' }).success
    ).toBe(false);
  });
});

describe('FastSessionSchema — requiere stimulusCategory + intensityLevel', () => {
  it('session válida pasa', () => {
    expect(FastSessionSchema.safeParse(VALID_SESSION).success).toBe(true);
  });

  it('session SIN stimulusCategory falla', () => {
    const { stimulusCategory: _sc, ...noSC } = VALID_SESSION;
    expect(FastSessionSchema.safeParse(noSC).success).toBe(false);
  });

  it('session SIN intensityLevel falla', () => {
    const { intensityLevel: _il, ...noIL } = VALID_SESSION;
    expect(FastSessionSchema.safeParse(noIL).success).toBe(false);
  });

  it("session con stimulusCategory='aerobic' (old name) falla", () => {
    expect(
      FastSessionSchema.safeParse({
        ...VALID_SESSION,
        stimulusCategory: 'aerobic'
      }).success
    ).toBe(false);
  });
});

describe('FastWeekSchema — requiere phase', () => {
  const VALID_WEEK = {
    weekNumber: 1,
    theme: 'Base',
    objective: 'Adaptación',
    focusAreas: ['fuerza', 'técnica'],
    loadLevel: 'moderado',
    deloadWeek: false,
    phase: 'base' as const,
    sessions: [VALID_SESSION]
  };

  it('week válida pasa', () => {
    expect(FastWeekSchema.safeParse(VALID_WEEK).success).toBe(true);
  });

  it('week SIN phase falla', () => {
    const { phase: _p, ...noP } = VALID_WEEK;
    expect(FastWeekSchema.safeParse(noP).success).toBe(false);
  });

  it('deloadWeek=true + phase="deload" es la combinación coherente', () => {
    expect(
      FastWeekSchema.safeParse({
        ...VALID_WEEK,
        weekNumber: 4,
        deloadWeek: true,
        phase: 'deload'
      }).success
    ).toBe(true);
  });

  // Nota: no validamos la coherencia deloadWeek↔phase en el schema (Zod
  // no lo fuerza). Eso queda para el validador de reglas de sub-fase 4
  // (regla 3.7: si deloadWeek=true, phase debería ser 'deload').
});

describe('FastPlanMetadataSchema — weekThemes requieren phase', () => {
  const VALID_METADATA = {
    objective: 'Subir de grado',
    mainObjective: 'Encadenar 7a en 4 meses',
    secondaryObjectives: ['fuerza dedos', 'técnica'],
    athleteSummary: 'Escalador intermedio',
    riskSummary: 'Sin lesiones activas',
    equipmentSummary: 'Gym + hangboard casa',
    mesocycleType: 'Base + fuerza',
    progressionModel: 'Semanas 1-3 carga, 4 descarga',
    weeklyFeedbackPrompt: '¿Cómo se sintió el bloque?',
    recoveryGuidelines: ['dormir 8h'],
    safetyRules: ['no max hangs con dolor'],
    weekThemes: [
      {
        weekNumber: 1,
        theme: 'Base',
        objective: 'Adaptación',
        focusAreas: ['técnica'],
        loadLevel: 'moderado',
        deloadWeek: false,
        phase: 'base' as const
      },
      {
        weekNumber: 4,
        theme: 'Descarga',
        objective: 'Recuperar',
        focusAreas: ['movilidad'],
        loadLevel: 'descarga',
        deloadWeek: true,
        phase: 'deload' as const
      }
    ]
  };

  it('metadata válida pasa', () => {
    expect(FastPlanMetadataSchema.safeParse(VALID_METADATA).success).toBe(true);
  });

  it('weekThemes SIN phase en algún item → falla', () => {
    const bad = {
      ...VALID_METADATA,
      weekThemes: [
        {
          ...VALID_METADATA.weekThemes[0],
          phase: undefined
        }
      ]
    };
    expect(FastPlanMetadataSchema.safeParse(bad).success).toBe(false);
  });
});
