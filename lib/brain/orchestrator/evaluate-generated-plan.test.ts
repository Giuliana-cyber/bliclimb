import { describe, expect, it } from 'vitest';
import { evaluateGeneratedPlan } from './evaluate-generated-plan';
import type {
  PlanForRules,
  PlanSessionForRules,
  PlanWeekForRules,
  PlanExerciseForRules,
  ProfileForRules
} from '../types';

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
  stimulusCategory: opts.stimulusCategory ?? null,
  intensityLevel: opts.intensityLevel ?? null,
  estimatedMinutes: 60,
  warmup: opts.warmup ?? [],
  mainBlock: opts.mainBlock ?? [],
  cooldown: opts.cooldown ?? []
});

const week = (
  weekNumber: number,
  sessions: PlanSessionForRules[],
  opts: Partial<PlanWeekForRules> = {}
): PlanWeekForRules => ({
  weekNumber,
  phase: opts.phase ?? null,
  deloadWeek: opts.deloadWeek ?? false,
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

describe('evaluateGeneratedPlan — combina los 4 validators', () => {
  it('plan limpio para veterano → {blocking: [], advisory: []}', () => {
    const p = plan([
      week(1, [
        session(1, {
          stimulusCategory: 'strength',
          intensityLevel: 'medium',
          mainBlock: [
            ex('Hangboard 20mm', {
              stimulusCategory: 'strength',
              riskLevel: 'alto',
              blockCategory: 'hangboard'
            })
          ]
        })
      ], { phase: 'base' })
    ]);
    const result = evaluateGeneratedPlan(p, profileVeteran());
    expect(result.blocking).toHaveLength(0);
    expect(result.advisory).toHaveLength(0);
  });

  it('plan con hangboard para u16 → blocking (§1.gating)', () => {
    const p = plan([
      week(1, [
        session(1, {
          stimulusCategory: 'strength',
          intensityLevel: 'medium',
          mainBlock: [
            ex('Max Hang', {
              stimulusCategory: 'strength',
              riskLevel: 'alto',
              blockCategory: 'hangboard'
            })
          ]
        })
      ], { phase: 'base' })
    ]);
    const result = evaluateGeneratedPlan(p, profileMinor());
    expect(result.blocking.length).toBeGreaterThanOrEqual(1);
    expect(result.blocking.some((v) => v.rule === '1.gating')).toBe(true);
  });

  it('plan con 3 hards consecutivos y >3 hard/semana → blocking (§3.3 + §3.10)', () => {
    const hard = (d: number) =>
      session(d, {
        stimulusCategory: 'strength',
        intensityLevel: 'hard',
        mainBlock: [ex('MaxHang', { stimulusCategory: 'strength', riskLevel: 'alto', blockCategory: null })]
      });
    const p = plan([week(1, [hard(1), hard(2), hard(3), hard(4)], { phase: 'base' })]);
    const result = evaluateGeneratedPlan(p, profileVeteran());
    expect(result.blocking.some((v) => v.rule === '3.3')).toBe(true);
    expect(result.blocking.some((v) => v.rule === '3.10')).toBe(true);
  });

  it('plan advisory-only (§10.6) → blocking vacío, advisory con 1', () => {
    const hard = (d: number) => session(d, { intensityLevel: 'hard' });
    const easy = (d: number) => session(d, { intensityLevel: 'easy' });
    const p = plan([week(1, [hard(1), hard(2), easy(3), easy(4)], { phase: 'base' })]);
    const result = evaluateGeneratedPlan(p, profileVeteran());
    // hard(1)+hard(2)+easy(3): no viola §3.3 (rest rompe secuencia después del 2)
    // 2 hard <=3 → no viola §3.10
    // Pero §10.6 con 4 días y hards consecutivos SÍ dispara advisory
    expect(result.advisory.some((v) => v.rule === '10.6')).toBe(true);
    // NO blocking porque el plan estructuralmente pasa el resto
    expect(result.blocking).toHaveLength(0);
  });
});

describe('evaluateGeneratedPlan — all[] contiene todos', () => {
  it('all = blocking + advisory', () => {
    const hard = (d: number) => session(d, { intensityLevel: 'hard' });
    const easy = (d: number) => session(d, { intensityLevel: 'easy' });
    const p = plan([week(1, [hard(1), hard(2), hard(3), easy(4)], { phase: 'base' })]);
    const result = evaluateGeneratedPlan(p, profileVeteran());
    expect(result.all.length).toBe(result.blocking.length + result.advisory.length);
  });
});
