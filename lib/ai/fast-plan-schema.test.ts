import { describe, expect, it } from 'vitest';
import {
  CooldownExerciseSchema,
  FastExerciseSchema,
  FastPlanMetadataSchema,
  FastSessionSchema,
  FastWeekSchema,
  IntensityLevelSchema,
  MainBlockExerciseSchema,
  RiskLevelSchema,
  StimulusCategorySchema,
  WarmupExerciseSchema,
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
  stimulusCategory: 'strength' as const,
  blockCategory: null,
  howTo: ['agarra', 'cuelga', 'baja'],
  cues: ['sentí flexores'],
  commonMistakes: ['no perder técnica en el último segundo']
};

// Bloque Opción 6 audit-360: los schemas de warmup y cooldown están
// restringidos por §3.6 — no aceptan 'strength'/'power'/'power-endurance'.
// El fixture VALID_SESSION antes reusaba VALID_EXERCISE (strength) para
// todos los bloques; ahora usamos exercises con stimulusCategory apto.
const VALID_WARMUP_EXERCISE = {
  ...VALID_EXERCISE,
  name: 'Movilidad de hombros con banda',
  stimulusCategory: 'mobility' as const,
  blockCategory: null,
  equipment: null,
  riskLevel: 'bajo' as const
};
const VALID_COOLDOWN_EXERCISE = {
  ...VALID_EXERCISE,
  name: 'Estiramiento de flexores',
  stimulusCategory: 'cooldown' as const,
  blockCategory: null,
  equipment: null,
  riskLevel: 'bajo' as const
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
  warmup: [VALID_WARMUP_EXERCISE],
  mainBlock: [VALID_EXERCISE, VALID_EXERCISE, VALID_EXERCISE, VALID_EXERCISE],
  cooldown: [VALID_COOLDOWN_EXERCISE, VALID_COOLDOWN_EXERCISE],
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

describe('FastExerciseSchema — requiere stimulusCategory per-exercise (sub-fase 4)', () => {
  it('exercise SIN stimulusCategory falla', () => {
    const { stimulusCategory: _sc, ...noSC } = VALID_EXERCISE;
    expect(FastExerciseSchema.safeParse(noSC).success).toBe(false);
  });

  it('exercise SIN blockCategory falla (sub-fase final del middleware)', () => {
    const { blockCategory: _bc, ...noBC } = VALID_EXERCISE;
    expect(FastExerciseSchema.safeParse(noBC).success).toBe(false);
  });

  it('exercise con blockCategory=null pasa (mayoría de ejercicios)', () => {
    expect(
      FastExerciseSchema.safeParse({ ...VALID_EXERCISE, blockCategory: null }).success
    ).toBe(true);
  });

  it.each([
    'hangboard',
    'hangboard-intense',
    'campus',
    'full-crimp',
    'hit',
    'pullups-weighted',
    'max-tests',
    'finger-training-any'
  ] as const)("exercise con blockCategory='%s' pasa", (v) => {
    expect(
      FastExerciseSchema.safeParse({ ...VALID_EXERCISE, blockCategory: v }).success
    ).toBe(true);
  });

  it("exercise con blockCategory='invalid' falla", () => {
    expect(
      FastExerciseSchema.safeParse({
        ...VALID_EXERCISE,
        blockCategory: 'invalid'
      }).success
    ).toBe(false);
  });

  it("exercise con stimulusCategory='aerobic' (old name) falla", () => {
    expect(
      FastExerciseSchema.safeParse({
        ...VALID_EXERCISE,
        stimulusCategory: 'aerobic'
      }).success
    ).toBe(false);
  });

  it.each([
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
  ] as const)("exercise con stimulusCategory='%s' pasa", (v) => {
    expect(
      FastExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
    ).toBe(true);
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

// -------------------- Opción 6 audit-360: schema restringido por bloque --------------------
//
// Estos tests garantizan la regla §3.6 por construcción: OpenAI structured
// output NO puede devolver un JSON donde un exercise con stimulusCategory
// prohibido aparezca en warmup o cooldown.

describe('WarmupStimulusSchema — solo permite {warmup, mobility, skill} (§3.6)', () => {
  it.each(['warmup', 'mobility', 'skill'] as const)(
    "stimulusCategory='%s' pasa en warmup",
    (v) => {
      expect(
        WarmupExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
      ).toBe(true);
    }
  );

  it.each([
    'strength',
    'power',
    'power-endurance',
    'aerobic-base',
    'mental',
    'cooldown',
    'rest'
  ] as const)("stimulusCategory='%s' es rechazado en warmup", (v) => {
    expect(
      WarmupExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
    ).toBe(false);
  });

  it('session con warmup que contiene strength → schema rechaza', () => {
    const badSession = {
      ...VALID_SESSION,
      warmup: [{ ...VALID_EXERCISE, stimulusCategory: 'strength' as const }]
    };
    expect(FastSessionSchema.safeParse(badSession).success).toBe(false);
  });

  it('session con warmup que contiene hangboard (blockCategory=hangboard) pero stimulusCategory=mobility → pasa', () => {
    // Edge case: si el LLM etiqueta blockCategory='hangboard' con
    // stimulusCategory='mobility' (activación suave), pasa. Es decisión del
    // brain rule si eso también viola §1.x, pero §3.6 solo mira stimulusCategory.
    const okSession = {
      ...VALID_SESSION,
      warmup: [
        {
          ...VALID_EXERCISE,
          stimulusCategory: 'mobility' as const,
          blockCategory: 'hangboard' as const
        }
      ]
    };
    expect(FastSessionSchema.safeParse(okSession).success).toBe(true);
  });
});

describe('MainBlockStimulusSchema — permite todas las cargables (§3.6)', () => {
  it.each([
    'skill',
    'strength',
    'power',
    'power-endurance',
    'aerobic-base',
    'mobility'
  ] as const)("stimulusCategory='%s' pasa en mainBlock", (v) => {
    expect(
      MainBlockExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
    ).toBe(true);
  });

  it.each(['warmup', 'cooldown', 'mental', 'rest'] as const)(
    "stimulusCategory='%s' rechazado en mainBlock",
    (v) => {
      expect(
        MainBlockExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
      ).toBe(false);
    }
  );
});

describe('CooldownStimulusSchema — solo permite {cooldown, mobility, rest} (§3.6)', () => {
  it.each(['cooldown', 'mobility', 'rest'] as const)(
    "stimulusCategory='%s' pasa en cooldown",
    (v) => {
      expect(
        CooldownExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
      ).toBe(true);
    }
  );

  it.each([
    'strength',
    'power',
    'power-endurance',
    'aerobic-base',
    'skill',
    'warmup',
    'mental'
  ] as const)("stimulusCategory='%s' rechazado en cooldown", (v) => {
    expect(
      CooldownExerciseSchema.safeParse({ ...VALID_EXERCISE, stimulusCategory: v }).success
    ).toBe(false);
  });

  it('session con cooldown que contiene power → schema rechaza', () => {
    const badSession = {
      ...VALID_SESSION,
      cooldown: [{ ...VALID_EXERCISE, stimulusCategory: 'power' as const }]
    };
    expect(FastSessionSchema.safeParse(badSession).success).toBe(false);
  });
});
