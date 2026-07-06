// Tests de §14.2 (extensores para prevención de epicondilitis).
//
// Cobertura:
//   - happy: 2 días tracción sin injuries → NO viola (bajo umbral)
//   - happy: 3 días tracción CON mobility → NO viola
//   - happy: injuries=elbows + 1 día tracción con mobility → NO viola
//   - viola: 3 días tracción sin mobility → SÍ (threshold general)
//   - viola: injuries=elbows + 1 día tracción sin mobility → SÍ
//     (epicondylitis-history — umbral baja a 1)
//   - EDGE: 2 días tracción CON elbows sin mobility → SÍ (independiente del count)
//   - EDGE: mobility en warmup vale (no solo en mainBlock)
//   - EDGE: mobility en cooldown vale
//   - EDGE: skill sessions NO cuentan como tracción
//   - permisivo: semana sin ninguna categoría → no dispara
//   - contexto diagnóstico: details.reason distingue los dos casos

import { describe, expect, it } from 'vitest';
import { section14ElbowPrevention } from './section-14-elbow-prevention';
import type {
  PlanExerciseForRules,
  PlanForRules,
  PlanSessionForRules,
  PlanWeekForRules,
  ProfileForRules
} from '../types';

// -------------------- Builders --------------------

const ex = (
  cat?: PlanExerciseForRules['stimulusCategory']
): PlanExerciseForRules => ({
  name: cat ? `Ejercicio ${cat}` : 'Genérico',
  stimulusCategory: cat ?? null,
  riskLevel: null
});

const session = (
  dayNumber: number,
  opts: Partial<PlanSessionForRules> = {}
): PlanSessionForRules => ({
  dayNumber,
  title: `Día ${dayNumber}`,
  stimulusCategory: opts.stimulusCategory ?? null,
  intensityLevel: opts.intensityLevel ?? null,
  estimatedMinutes: 60,
  warmup: opts.warmup ?? [],
  mainBlock: opts.mainBlock ?? [],
  cooldown: opts.cooldown ?? []
});

const week = (
  weekNumber: number,
  sessions: PlanSessionForRules[]
): PlanWeekForRules => ({
  weekNumber,
  phase: null,
  deloadWeek: false,
  sessions
});

const plan = (weeks: PlanWeekForRules[]): PlanForRules => ({ weeks });

const profileNoInjuries = (): ProfileForRules => ({
  age: '26-35',
  climbingTime: 'more3',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  sleep: 'good'
});

const profileElbows = (): ProfileForRules => ({
  ...profileNoInjuries(),
  injuries: ['elbows']
});

// -------------------- Convenience session builders --------------------

const strengthSession = (d: number, withMobility = false): PlanSessionForRules =>
  session(d, {
    stimulusCategory: 'strength',
    mainBlock: [ex('strength')],
    cooldown: withMobility ? [ex('mobility')] : [ex('cooldown')]
  });

const skillSession = (d: number): PlanSessionForRules =>
  session(d, {
    stimulusCategory: 'skill',
    mainBlock: [ex('skill')]
  });

// ==================== Happy paths ====================

describe('§14.2 — happy paths', () => {
  it('happy: 2 días de tracción sin injuries → NO viola (bajo umbral)', () => {
    const p = plan([week(1, [strengthSession(1), strengthSession(3)])]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });

  it('happy: 3 días tracción CON mobility en cooldown → NO viola', () => {
    const p = plan([
      week(1, [
        strengthSession(1, true), // cooldown mobility
        strengthSession(3),
        strengthSession(5)
      ])
    ]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });

  it('happy: injuries=elbows + 1 día tracción CON mobility → NO viola', () => {
    const p = plan([week(1, [strengthSession(1, true)])]);
    expect(section14ElbowPrevention.check(p, profileElbows())).toHaveLength(0);
  });
});

// ==================== Violaciones ====================

describe('§14.2 — violaciones', () => {
  it('viola: 3 días tracción SIN mobility en la semana', () => {
    const p = plan([
      week(1, [strengthSession(1), strengthSession(3), strengthSession(5)])
    ]);
    const vs = section14ElbowPrevention.check(p, profileNoInjuries());
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('blocking');
    expect(vs[0].rule).toBe('14.2');
    if (vs[0].details.kind === 'missing-extensor-work') {
      expect(vs[0].details.tractionDaysInWeek).toBe(3);
      expect(vs[0].details.hasEpicondylitisHistory).toBe(false);
      expect(vs[0].details.reason).toBe('traction-threshold');
    }
  });

  it('viola: injuries=elbows + 1 día tracción SIN mobility (epicondylitis-history)', () => {
    const p = plan([week(1, [strengthSession(1)])]);
    const vs = section14ElbowPrevention.check(p, profileElbows());
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'missing-extensor-work') {
      expect(vs[0].details.tractionDaysInWeek).toBe(1);
      expect(vs[0].details.hasEpicondylitisHistory).toBe(true);
      expect(vs[0].details.reason).toBe('epicondylitis-history');
    }
  });

  it('EDGE: 2 días tracción con elbows SIN mobility → SÍ (umbral cae a 1)', () => {
    const p = plan([week(1, [strengthSession(1), strengthSession(3)])]);
    const vs = section14ElbowPrevention.check(p, profileElbows());
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'missing-extensor-work') {
      expect(vs[0].details.reason).toBe('epicondylitis-history');
      expect(vs[0].details.tractionDaysInWeek).toBe(2);
    }
  });
});

// ==================== Edge cases de detección ====================

describe('§14.2 — detección de mobility en distintos bloques', () => {
  it('EDGE: mobility en WARMUP vale como extensor work', () => {
    const p = plan([
      week(1, [
        session(1, {
          stimulusCategory: 'strength',
          warmup: [ex('mobility')],
          mainBlock: [ex('strength')]
        }),
        strengthSession(3),
        strengthSession(5)
      ])
    ]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });

  it('EDGE: mobility en MAINBLOCK vale como extensor work', () => {
    const p = plan([
      week(1, [
        session(1, {
          stimulusCategory: 'strength',
          mainBlock: [ex('strength'), ex('mobility')]
        }),
        strengthSession(3),
        strengthSession(5)
      ])
    ]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });

  it('EDGE: mobility en cualquier OTRA sesión de la semana cumple', () => {
    // 3 días de tracción; el mobility vive en una 4ta sesión distinta.
    const p = plan([
      week(1, [
        strengthSession(1),
        strengthSession(3),
        strengthSession(5),
        session(7, {
          stimulusCategory: 'mobility',
          mainBlock: [ex('mobility')]
        })
      ])
    ]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });
});

// ==================== Skill NO cuenta como tracción ====================

describe('§14.2 — skill NO cuenta como tracción', () => {
  it('EDGE: 3 días skill + 0 tracción → NO dispara (bajo umbral)', () => {
    const p = plan([week(1, [skillSession(1), skillSession(3), skillSession(5)])]);
    expect(
      section14ElbowPrevention.check(p, profileNoInjuries())
    ).toHaveLength(0);
  });

  it('EDGE: 2 skill + 3 tracción sin mobility → SÍ dispara por las 3 tracción', () => {
    const p = plan([
      week(1, [
        skillSession(1),
        strengthSession(2),
        skillSession(3),
        strengthSession(4),
        strengthSession(5)
      ])
    ]);
    const vs = section14ElbowPrevention.check(p, profileNoInjuries());
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'missing-extensor-work') {
      expect(vs[0].details.tractionDaysInWeek).toBe(3);
    }
  });
});

// ==================== Permisivos ====================

describe('§14.2 — fallback permisivo', () => {
  it('permisivo: semana con sesiones sin stimulusCategory → no dispara', () => {
    const p = plan([week(1, [session(1), session(3), session(5)])]);
    expect(
      section14ElbowPrevention.check(p, profileElbows())
    ).toHaveLength(0);
  });

  it('permisivo: sin profile pasado → nunca dispara por historial (solo por count)', () => {
    // 3 días tracción sin mobility → sí dispara pero por threshold general
    const p = plan([
      week(1, [strengthSession(1), strengthSession(3), strengthSession(5)])
    ]);
    const vs = section14ElbowPrevention.check(p); // profile undefined
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'missing-extensor-work') {
      expect(vs[0].details.hasEpicondylitisHistory).toBe(false);
      expect(vs[0].details.reason).toBe('traction-threshold');
    }
  });

  it('permisivo: injuries sin "elbows" (ej: solo "shoulders") no eleva la severity', () => {
    const p = plan([week(1, [strengthSession(1)])]);
    const profile: ProfileForRules = {
      ...profileNoInjuries(),
      injuries: ['shoulders', 'fingers']
    };
    // 1 día tracción, threshold general = 3 → no dispara
    expect(section14ElbowPrevention.check(p, profile)).toHaveLength(0);
  });
});

// ==================== Multi-week ====================

describe('§14.2 — emite una violation por semana', () => {
  it('viola: 2 semanas sin extensor work → 2 violations distintas', () => {
    const p = plan([
      week(1, [strengthSession(1), strengthSession(3), strengthSession(5)]),
      week(2, [strengthSession(1), strengthSession(3), strengthSession(5)])
    ]);
    const vs = section14ElbowPrevention.check(p, profileNoInjuries());
    expect(vs).toHaveLength(2);
    expect(vs[0].location.weekNumber).toBe(1);
    expect(vs[1].location.weekNumber).toBe(2);
  });

  it('happy: semana 1 sin mobility (viola) + semana 2 con mobility (pasa)', () => {
    const p = plan([
      week(1, [strengthSession(1), strengthSession(3), strengthSession(5)]),
      week(2, [strengthSession(1, true), strengthSession(3), strengthSession(5)])
    ]);
    const vs = section14ElbowPrevention.check(p, profileNoInjuries());
    expect(vs).toHaveLength(1);
    expect(vs[0].location.weekNumber).toBe(1);
  });
});
