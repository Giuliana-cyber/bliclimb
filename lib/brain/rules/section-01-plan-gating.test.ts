// Tests de §1.gating — enforcement plan-level de section-01.
//
// Cobertura:
//   - happy: perfil u16 con plan sin ejercicios de hangboard → NO viola
//   - viola: perfil u16 con "MaxHang" etiquetado blockCategory='hangboard' → SÍ
//   - viola: perfil <2y con dominadas con lastre etiquetadas
//     blockCategory='pullups-weighted' → SÍ
//   - EDGE: exercise con blockCategory=null → NO dispara (fallback permisivo)
//   - EDGE: perfil adulto experimentado (no bloqueos) → NO dispara aunque
//     el plan tenga hangboard etiquetado
//   - contexto diagnóstico: details.blockedCategory, exerciseName, profileRule
//   - multi-week / multi-block: violation por cada ejercicio culpable

import { describe, expect, it } from 'vitest';
import { section01PlanGating } from './section-01-plan-gating';
import type {
  PlanExerciseForRules,
  PlanForRules,
  PlanSessionForRules,
  PlanWeekForRules,
  ProfileForRules
} from '../types';

// -------------------- Builders --------------------

const ex = (
  name: string,
  blockCategory?: PlanExerciseForRules['blockCategory']
): PlanExerciseForRules => ({
  name,
  stimulusCategory: null,
  riskLevel: null,
  blockCategory: blockCategory ?? null
});

const session = (
  dayNumber: number,
  opts: Partial<PlanSessionForRules> = {}
): PlanSessionForRules => ({
  dayNumber,
  title: `Día ${dayNumber}`,
  stimulusCategory: null,
  intensityLevel: null,
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

const profileMinor = (): ProfileForRules => ({
  age: 'u16',
  climbingTime: '1to3',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  sleep: 'good'
});

const profileNewClimber = (): ProfileForRules => ({
  age: '26-35',
  climbingTime: 'less1',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  sleep: 'good'
});

const profileVeteran = (): ProfileForRules => ({
  age: '26-35',
  climbingTime: 'more3',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  sleep: 'good'
});

// ==================== Happy paths ====================

describe('§1.gating — happy paths', () => {
  it('u16 con plan solo de skill (sin blockCategory) → NO viola', () => {
    const p = plan([
      week(1, [
        session(1, { mainBlock: [ex('Silent feet drill'), ex('Traverse suave')] })
      ])
    ]);
    expect(section01PlanGating.check(p, profileMinor())).toHaveLength(0);
  });

  it('u16 con mobility y aerobic-base (null blockCategory) → NO viola', () => {
    const p = plan([
      week(1, [
        session(1, {
          warmup: [ex('Movilidad de cadera', null)],
          mainBlock: [ex('ARC 30min', null)],
          cooldown: [ex('Estiramientos', null)]
        })
      ])
    ]);
    expect(section01PlanGating.check(p, profileMinor())).toHaveLength(0);
  });

  it('veterano sin bloqueos → NO viola aunque tenga hangboard etiquetado', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('MaxHang 20mm', 'hangboard')]
        })
      ])
    ]);
    expect(section01PlanGating.check(p, profileVeteran())).toHaveLength(0);
  });
});

// ==================== Violaciones ====================

describe('§1.gating — violaciones (menor)', () => {
  it('u16 con hangboard etiquetado en mainBlock → viola blocking', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('MaxHang 20mm en Hangboard', 'hangboard')]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileMinor());
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('blocking');
    expect(vs[0].rule).toBe('1.gating');
    expect(vs[0].section).toBe('section-01');
    if (vs[0].details.kind === 'gated-exercise-slipped') {
      expect(vs[0].details.blockedCategory).toBe('hangboard');
      expect(vs[0].details.exerciseName).toBe('MaxHang 20mm en Hangboard');
      // profileRule debería ser '1.1' porque u16 dispara §1.1
      expect(vs[0].details.profileRule).toBe('1.1');
    }
    expect(vs[0].location.weekNumber).toBe(1);
    expect(vs[0].location.dayNumber).toBe(1);
    expect(vs[0].location.block).toBe('mainBlock');
    expect(vs[0].location.exerciseIndex).toBe(0);
  });

  it('u16 con campus etiquetado en warmup → viola por bloque warmup', () => {
    const p = plan([
      week(1, [
        session(1, {
          warmup: [ex('Campus board activación', 'campus')]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileMinor());
    expect(vs).toHaveLength(1);
    expect(vs[0].location.block).toBe('warmup');
    if (vs[0].details.kind === 'gated-exercise-slipped') {
      expect(vs[0].details.blockedCategory).toBe('campus');
    }
  });

  it('u16 con 2 ejercicios prohibidos en semanas distintas → 2 violations', () => {
    const p = plan([
      week(1, [
        session(1, { mainBlock: [ex('Hangboard 20mm', 'hangboard')] })
      ]),
      week(2, [
        session(1, { mainBlock: [ex('Campus reach', 'campus')] })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileMinor());
    expect(vs).toHaveLength(2);
    expect(vs[0].location.weekNumber).toBe(1);
    expect(vs[1].location.weekNumber).toBe(2);
  });
});

describe('§1.gating — violaciones (climber <2 años)', () => {
  it('climber less1 con dominadas con lastre etiquetadas → viola', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('Dominadas con lastre +10kg', 'pullups-weighted')]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileNewClimber());
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'gated-exercise-slipped') {
      expect(vs[0].details.blockedCategory).toBe('pullups-weighted');
    }
  });

  it('climber less1 con test maximo → viola (max-tests bloqueada por §1.2)', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('Critical Force Test', 'max-tests')]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileNewClimber());
    expect(vs).toHaveLength(1);
  });
});

// ==================== Edge cases ====================

describe('§1.gating — edge cases', () => {
  it('exercise con blockCategory=null en perfil bloqueado → NO dispara (fallback permisivo)', () => {
    const p = plan([
      week(1, [
        session(1, { mainBlock: [ex('Ejercicio sin etiqueta', null)] })
      ])
    ]);
    expect(section01PlanGating.check(p, profileMinor())).toHaveLength(0);
  });

  it('sin profile pasado → NO dispara nunca', () => {
    const p = plan([
      week(1, [session(1, { mainBlock: [ex('Hangboard 20mm', 'hangboard')] })])
    ]);
    expect(section01PlanGating.check(p)).toHaveLength(0);
  });

  it('violation en cada uno de los 3 bloques (warmup/mainBlock/cooldown)', () => {
    const p = plan([
      week(1, [
        session(1, {
          warmup: [ex('CB warmup', 'campus')],
          mainBlock: [ex('HB max', 'hangboard')],
          cooldown: [ex('CB extra', 'campus')]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileMinor());
    expect(vs).toHaveLength(3);
    expect(vs.map((v) => v.location.block).sort()).toEqual([
      'cooldown',
      'mainBlock',
      'warmup'
    ]);
  });
});

// ==================== Diagnostic ====================

describe('§1.gating — contexto diagnóstico útil para retry prompt', () => {
  it('details incluye exerciseName + blockedCategory + profileRule', () => {
    const p = plan([
      week(2, [
        session(3, {
          mainBlock: [
            ex('Warmup', null),
            ex('MaxHang FullCrimp 15mm', 'hangboard')
          ]
        })
      ])
    ]);
    const vs = section01PlanGating.check(p, profileMinor());
    expect(vs).toHaveLength(1);
    const v = vs[0];
    expect(v.location.weekNumber).toBe(2);
    expect(v.location.dayNumber).toBe(3);
    expect(v.location.exerciseIndex).toBe(1);
    if (v.details.kind === 'gated-exercise-slipped') {
      expect(v.details.exerciseName).toBe('MaxHang FullCrimp 15mm');
      expect(v.details.blockedCategory).toBe('hangboard');
      expect(v.details.profileRule).toBe('1.1');
    }
  });
});
