import { describe, expect, it } from 'vitest';
import { detectLowConfidenceBlockCategory } from './low-confidence-block-category';
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
  opts: Partial<PlanExerciseForRules> = {}
): PlanExerciseForRules => ({
  name,
  stimulusCategory: opts.stimulusCategory ?? null,
  riskLevel: opts.riskLevel ?? null,
  blockCategory: opts.blockCategory ?? null
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

const profileVeteran = (): ProfileForRules => ({
  age: '26-35',
  climbingTime: 'more3',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  sleep: 'good'
});

// ==================== Emite ====================

describe('detectLowConfidenceBlockCategory — emite eventos sospechosos', () => {
  it('u16 con strength+alto+null → emite evento', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('Front lever tucked', {
              stimulusCategory: 'strength',
              riskLevel: 'alto',
              blockCategory: null
            })
          ]
        })
      ])
    ]);
    const events = detectLowConfidenceBlockCategory(p, profileMinor());
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('low-confidence-block-category');
    expect(events[0].exerciseName).toBe('Front lever tucked');
    expect(events[0].stimulusCategory).toBe('strength');
    expect(events[0].riskLevel).toBe('alto');
    expect(events[0].profileAge).toBe('u16');
    expect(events[0].activeProfileBlocks.length).toBeGreaterThan(0);
    expect(events[0].location).toEqual({
      weekNumber: 1,
      dayNumber: 1,
      block: 'mainBlock',
      exerciseIndex: 0
    });
  });

  it('u16 con power+alto+null → emite evento', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('Muscle-up bodyweight', {
              stimulusCategory: 'power',
              riskLevel: 'alto',
              blockCategory: null
            })
          ]
        })
      ])
    ]);
    const events = detectLowConfidenceBlockCategory(p, profileMinor());
    expect(events).toHaveLength(1);
    expect(events[0].stimulusCategory).toBe('power');
  });

  it('detecta en cualquier bloque (warmup/mainBlock/cooldown)', () => {
    const suspect = ex('Ejercicio sospechoso', {
      stimulusCategory: 'strength',
      riskLevel: 'alto',
      blockCategory: null
    });
    const p = plan([
      week(1, [
        session(1, {
          warmup: [suspect],
          mainBlock: [suspect],
          cooldown: [suspect]
        })
      ])
    ]);
    const events = detectLowConfidenceBlockCategory(p, profileMinor());
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.location.block).sort()).toEqual([
      'cooldown',
      'mainBlock',
      'warmup'
    ]);
  });
});

// ==================== NO emite ====================

describe('detectLowConfidenceBlockCategory — NO emite (falsos positivos evitados)', () => {
  it('veterano sin bloqueos → nunca emite aunque haya strength+alto+null', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('Front lever', {
              stimulusCategory: 'strength',
              riskLevel: 'alto',
              blockCategory: null
            })
          ]
        })
      ])
    ]);
    expect(
      detectLowConfidenceBlockCategory(p, profileVeteran())
    ).toHaveLength(0);
  });

  it('u16 con strength+alto pero blockCategory YA etiquetada → no emite', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('MaxHang 20mm', {
              stimulusCategory: 'strength',
              riskLevel: 'alto',
              blockCategory: 'hangboard'
            })
          ]
        })
      ])
    ]);
    expect(detectLowConfidenceBlockCategory(p, profileMinor())).toHaveLength(
      0
    );
  });

  it('u16 con strength pero riskLevel medio → no emite', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('Dominadas BW', {
              stimulusCategory: 'strength',
              riskLevel: 'medio',
              blockCategory: null
            })
          ]
        })
      ])
    ]);
    expect(detectLowConfidenceBlockCategory(p, profileMinor())).toHaveLength(
      0
    );
  });

  it('u16 con stimulus skill/aerobic-base + alto + null → no emite (fuera de {strength,power})', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('Ejercicio skill', {
              stimulusCategory: 'skill',
              riskLevel: 'alto',
              blockCategory: null
            })
          ]
        })
      ])
    ]);
    expect(detectLowConfidenceBlockCategory(p, profileMinor())).toHaveLength(
      0
    );
  });

  it('u16 con ejercicio sin stimulus/risk poblados → no emite', () => {
    const p = plan([week(1, [session(1, { mainBlock: [ex('Cualquiera')] })])]);
    expect(detectLowConfidenceBlockCategory(p, profileMinor())).toHaveLength(
      0
    );
  });
});
