// Tests del post-procesador determinístico del plan.
//
// Cubre las 3 garantías de la Opción 6 (audit-360 fix bug #2):
//   §3.1 reorderMainBlockBySafety — ordena mainBlock por INTRA_SESSION_ORDER.
//   §14.2 ensureExtensorWork — inyecta extensor si falta según umbrales.
//   Idempotencia: aplicar el pipeline 2 veces == 1 vez.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXTENSOR_EXERCISE,
  countViolationsByRule,
  ensureExtensorWork,
  postProcessWeek,
  reorderMainBlockBySafety
} from './plan-post-process';
import type {
  FastSession,
  FastWeek,
  MainBlockExercise,
  CooldownExercise,
  WarmupExercise
} from './fast-plan-schema';

// -------------------- Fixtures --------------------

function makeMainExercise(
  stimulusCategory: MainBlockExercise['stimulusCategory'],
  name = `ex-${stimulusCategory}`
): MainBlockExercise {
  return {
    name,
    description: `${name} descripción`,
    sets: 3,
    reps: '8',
    rest: '90s',
    intensity: 'RPE 7',
    notes: null,
    alternative: null,
    equipment: 'gym',
    riskLevel: 'medio',
    stimulusCategory,
    blockCategory: null,
    howTo: ['paso'],
    cues: ['cue'],
    commonMistakes: ['error']
  };
}

function makeCooldownExercise(
  stimulusCategory: CooldownExercise['stimulusCategory'] = 'cooldown',
  name = `cd-${stimulusCategory}`
): CooldownExercise {
  return {
    name,
    description: `${name} descripción`,
    sets: 2,
    reps: '10',
    rest: '30s',
    intensity: 'easy',
    notes: null,
    alternative: null,
    equipment: null,
    riskLevel: 'bajo',
    stimulusCategory,
    blockCategory: null,
    howTo: ['paso'],
    cues: ['cue'],
    commonMistakes: ['error']
  };
}

function makeWarmupExercise(
  stimulusCategory: WarmupExercise['stimulusCategory'] = 'warmup'
): WarmupExercise {
  return {
    name: `wu-${stimulusCategory}`,
    description: 'wu descripción',
    sets: 1,
    reps: '10',
    rest: '30s',
    intensity: 'easy',
    notes: null,
    alternative: null,
    equipment: null,
    riskLevel: 'bajo',
    stimulusCategory,
    blockCategory: null,
    howTo: ['paso'],
    cues: ['cue'],
    commonMistakes: ['error']
  };
}

function makeSession(overrides: Partial<FastSession> = {}): FastSession {
  return {
    dayNumber: 1,
    title: 'Día 1',
    location: 'gym',
    estimatedMinutes: 60,
    objective: 'obj',
    why: 'why',
    intensityTarget: 'RPE 7',
    stimulusCategory: 'strength',
    intensityLevel: 'medium',
    warmup: [makeWarmupExercise('warmup')],
    mainBlock: [makeMainExercise('strength')],
    cooldown: [makeCooldownExercise('cooldown')],
    safetyNotes: ['note'],
    adjustmentRules: ['rule'],
    successCriteria: ['crit'],
    nutritionTip: 'tip',
    source: 'Test',
    ...overrides
  };
}

function makeWeek(sessions: FastSession[]): FastWeek {
  return {
    weekNumber: 1,
    theme: 'Test',
    objective: 'obj',
    focusAreas: ['area'],
    loadLevel: 'moderate',
    deloadWeek: false,
    phase: 'base',
    sessions
  };
}

// -------------------- §3.1 · reorderMainBlockBySafety --------------------

describe('reorderMainBlockBySafety (§3.1)', () => {
  it('mainBlock ya ordenado → no cambia el orden', () => {
    const session = makeSession({
      mainBlock: [
        makeMainExercise('skill'),
        makeMainExercise('strength'),
        makeMainExercise('power'),
        makeMainExercise('power-endurance')
      ]
    });
    const out = reorderMainBlockBySafety(session);
    expect(out.mainBlock.map((e) => e.stimulusCategory)).toEqual([
      'skill',
      'strength',
      'power',
      'power-endurance'
    ]);
  });

  it('mainBlock desordenado → reordena ascendente', () => {
    const session = makeSession({
      mainBlock: [
        makeMainExercise('power'),
        makeMainExercise('skill'),
        makeMainExercise('strength')
      ]
    });
    const out = reorderMainBlockBySafety(session);
    expect(out.mainBlock.map((e) => e.stimulusCategory)).toEqual([
      'skill',
      'strength',
      'power'
    ]);
  });

  it('skill después de strength/power → skill sube a la primera mitad (§3.2 cubierta)', () => {
    const session = makeSession({
      mainBlock: [
        makeMainExercise('strength', 'hangboard'),
        makeMainExercise('power', 'campus'),
        makeMainExercise('skill', 'silent-feet')
      ]
    });
    const out = reorderMainBlockBySafety(session);
    expect(out.mainBlock[0].name).toBe('silent-feet');
    expect(out.mainBlock[0].stimulusCategory).toBe('skill');
  });

  it('preserva TODO el contenido de cada exercise (howTo, cues, sets, reps, blockCategory)', () => {
    const original = makeMainExercise('strength', 'hang');
    original.howTo = ['a', 'b', 'c'];
    original.cues = ['cue1', 'cue2'];
    original.sets = 5;
    original.blockCategory = 'hangboard';
    const session = makeSession({
      mainBlock: [makeMainExercise('skill'), original]
    });
    const out = reorderMainBlockBySafety(session);
    const persistedOriginal = out.mainBlock.find((e) => e.name === 'hang');
    expect(persistedOriginal?.howTo).toEqual(['a', 'b', 'c']);
    expect(persistedOriginal?.cues).toEqual(['cue1', 'cue2']);
    expect(persistedOriginal?.sets).toBe(5);
    expect(persistedOriginal?.blockCategory).toBe('hangboard');
  });

  it('stable: dos ejercicios con misma categoría mantienen orden relativo original', () => {
    const s1 = makeMainExercise('strength', 'hang-A');
    const s2 = makeMainExercise('strength', 'hang-B');
    const session = makeSession({
      mainBlock: [makeMainExercise('power'), s1, s2, makeMainExercise('skill')]
    });
    const out = reorderMainBlockBySafety(session);
    const strengthIdxA = out.mainBlock.findIndex((e) => e.name === 'hang-A');
    const strengthIdxB = out.mainBlock.findIndex((e) => e.name === 'hang-B');
    expect(strengthIdxA).toBeLessThan(strengthIdxB);
  });

  it('warmup y cooldown NO se tocan', () => {
    const session = makeSession({
      warmup: [makeWarmupExercise('mobility'), makeWarmupExercise('warmup')],
      mainBlock: [makeMainExercise('power'), makeMainExercise('skill')],
      cooldown: [makeCooldownExercise('mobility'), makeCooldownExercise('cooldown')]
    });
    const out = reorderMainBlockBySafety(session);
    expect(out.warmup.map((e) => e.stimulusCategory)).toEqual(['mobility', 'warmup']);
    expect(out.cooldown.map((e) => e.stimulusCategory)).toEqual([
      'mobility',
      'cooldown'
    ]);
  });
});

// -------------------- §14.2 · ensureExtensorWork --------------------

describe('ensureExtensorWork (§14.2)', () => {
  it('perfil con elbows + 1 sesión de tracción sin mobility → inyecta extensor', () => {
    const week = makeWeek([
      makeSession({ stimulusCategory: 'strength' })
    ]);
    const out = ensureExtensorWork(week, { injuries: ['elbows'] });
    const targetCooldown = out.sessions[0].cooldown;
    const last = targetCooldown[targetCooldown.length - 1];
    expect(last.name).toBe('Band pull-aparts para extensores');
    expect(last.stimulusCategory).toBe('mobility');
  });

  it('perfil sin elbows + 2 sesiones de tracción → NO inyecta (threshold = 3)', () => {
    const week = makeWeek([
      makeSession({ dayNumber: 1, stimulusCategory: 'strength' }),
      makeSession({ dayNumber: 2, stimulusCategory: 'power' })
    ]);
    const out = ensureExtensorWork(week, { injuries: [] });
    expect(out.sessions[0].cooldown).toEqual(week.sessions[0].cooldown);
    expect(out.sessions[1].cooldown).toEqual(week.sessions[1].cooldown);
  });

  it('perfil sin elbows + 3 sesiones de tracción sin mobility → inyecta', () => {
    const week = makeWeek([
      makeSession({ dayNumber: 1, stimulusCategory: 'strength', estimatedMinutes: 90 }),
      makeSession({ dayNumber: 2, stimulusCategory: 'power', estimatedMinutes: 60 }),
      makeSession({ dayNumber: 3, stimulusCategory: 'power-endurance', estimatedMinutes: 75 })
    ]);
    const out = ensureExtensorWork(week, { injuries: [] });
    // La sesión más corta es día 2 (60 min). Ahí debe estar la inyección.
    const shortSession = out.sessions.find((s) => s.dayNumber === 2)!;
    const last = shortSession.cooldown[shortSession.cooldown.length - 1];
    expect(last.name).toBe('Band pull-aparts para extensores');
  });

  it('semana con ya al menos 1 mobility en cualquier bloque → NO duplica', () => {
    const week = makeWeek([
      makeSession({
        stimulusCategory: 'strength',
        cooldown: [makeCooldownExercise('mobility', 'ya-hay')]
      }),
      makeSession({ dayNumber: 2, stimulusCategory: 'power' }),
      makeSession({ dayNumber: 3, stimulusCategory: 'power-endurance' })
    ]);
    const out = ensureExtensorWork(week, { injuries: ['elbows'] });
    for (const s of out.sessions) {
      const injected = [...s.warmup, ...s.mainBlock, ...s.cooldown].find(
        (e) => e.name === 'Band pull-aparts para extensores'
      );
      expect(injected).toBeUndefined();
    }
  });

  it('mobility en warmup vale para cumplir §14.2', () => {
    const week = makeWeek([
      makeSession({
        stimulusCategory: 'strength',
        warmup: [makeWarmupExercise('mobility')]
      })
    ]);
    const out = ensureExtensorWork(week, { injuries: ['elbows'] });
    // No debe inyectar porque el warmup ya trae mobility.
    for (const s of out.sessions) {
      const injected = s.cooldown.find(
        (e) => e.name === 'Band pull-aparts para extensores'
      );
      expect(injected).toBeUndefined();
    }
  });

  it('semana sin sesiones de tracción → NO inyecta (regla no aplica)', () => {
    const week = makeWeek([
      makeSession({ stimulusCategory: 'skill' }),
      makeSession({ dayNumber: 2, stimulusCategory: 'rest' })
    ]);
    const out = ensureExtensorWork(week, { injuries: ['elbows'] });
    const injected = out.sessions[0].cooldown.find(
      (e) => e.name === 'Band pull-aparts para extensores'
    );
    expect(injected).toBeUndefined();
  });

  it('semana con 0 sesiones → devuelve la semana sin cambios (defensivo)', () => {
    const week = makeWeek([]);
    const out = ensureExtensorWork(week, { injuries: ['elbows'] });
    expect(out.sessions).toEqual([]);
  });

  it('DEFAULT_EXTENSOR_EXERCISE tiene voz tú (sin voseo)', () => {
    // Guardia contra regresión: el sweep vos→tú de la Fase 5 no puede
    // reintroducirse a través de este ejercicio inyectado.
    const allText = [
      ...DEFAULT_EXTENSOR_EXERCISE.howTo,
      ...DEFAULT_EXTENSOR_EXERCISE.cues,
      ...DEFAULT_EXTENSOR_EXERCISE.commonMistakes,
      DEFAULT_EXTENSOR_EXERCISE.notes ?? ''
    ].join(' ');
    // Voseo típico en imperativos: acentos en la última sílaba.
    expect(allText).not.toMatch(/\b(separá|volvé|hacé|priorizá|tomá|manté)\b/);
    // Verificamos que las formas correctas están (tú/imperativo neutro).
    expect(allText).toContain('Separa');
    expect(allText).toContain('Vuelve');
    expect(allText).toContain('Haz');
    expect(allText).toContain('Mantén');
  });

  it('DEFAULT_EXTENSOR_EXERCISE.notes usa voz de coach, no de sistema', () => {
    // Guardia: no "Bill/Senda: agregamos automáticamente".
    expect(DEFAULT_EXTENSOR_EXERCISE.notes).not.toContain('Bill');
    expect(DEFAULT_EXTENSOR_EXERCISE.notes).not.toContain('Senda');
    expect(DEFAULT_EXTENSOR_EXERCISE.notes).not.toContain('automáticamente');
    // Sí debe explicar el porqué.
    expect(DEFAULT_EXTENSOR_EXERCISE.notes).toContain('flexores');
    expect(DEFAULT_EXTENSOR_EXERCISE.notes).toContain('codo');
  });
});

// -------------------- Pipeline completo · postProcessWeek + idempotencia --------------------

describe('postProcessWeek', () => {
  it('aplica §3.1 (reorder) + §14.2 (extensor) en una llamada', () => {
    const week = makeWeek([
      makeSession({
        stimulusCategory: 'strength',
        mainBlock: [
          makeMainExercise('power'),
          makeMainExercise('skill'),
          makeMainExercise('strength')
        ]
      })
    ]);
    const out = postProcessWeek(week, { injuries: ['elbows'] });
    // §3.1: mainBlock reordenado.
    expect(out.sessions[0].mainBlock.map((e) => e.stimulusCategory)).toEqual([
      'skill',
      'strength',
      'power'
    ]);
    // §14.2: extensor inyectado.
    const last = out.sessions[0].cooldown.at(-1);
    expect(last?.name).toBe('Band pull-aparts para extensores');
  });

  it('idempotencia: aplicar dos veces == aplicar una', () => {
    const week = makeWeek([
      makeSession({
        stimulusCategory: 'strength',
        mainBlock: [makeMainExercise('power'), makeMainExercise('skill')]
      })
    ]);
    const once = postProcessWeek(week, { injuries: ['elbows'] });
    const twice = postProcessWeek(once, { injuries: ['elbows'] });
    expect(twice).toEqual(once);
  });
});

// -------------------- countViolationsByRule --------------------

describe('countViolationsByRule', () => {
  it('cuenta correctamente por rule id', () => {
    const violations = [
      { rule: '3.6' },
      { rule: '3.6' },
      { rule: '3.1' },
      { rule: '14.2' },
      { rule: '3.6' }
    ];
    expect(countViolationsByRule(violations)).toEqual({
      '3.6': 3,
      '3.1': 1,
      '14.2': 1
    });
  });

  it('array vacío → objeto vacío', () => {
    expect(countViolationsByRule([])).toEqual({});
  });
});
