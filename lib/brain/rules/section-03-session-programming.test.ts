// Tests exhaustivos del section-03-session-programming module.
//
// Estructura: por cada regla → happy path + violación clara + edge cases
// reales (los que se caen si no se piensan bien). Cada test construye un
// plan mínimo con solo los campos que la regla necesita — el resto son
// null/undefined y el fallback permisivo debería ignorarlos.

import { describe, expect, it } from 'vitest';
import {
  section03SessionProgramming,
  section10LoadAlternation
} from './section-03-session-programming';
import type {
  PlanForRules,
  PlanSessionForRules,
  PlanWeekForRules,
  PlanExerciseForRules,
  PlanViolation
} from '../types';

// -------------------- Builders --------------------

const ex = (
  cat?: PlanExerciseForRules['stimulusCategory'],
  risk?: PlanExerciseForRules['riskLevel']
): PlanExerciseForRules => ({
  name: cat ? `Ejercicio ${cat}` : 'Genérico',
  stimulusCategory: cat ?? null,
  riskLevel: risk ?? null
});

const session = (
  dayNumber: number,
  opts: Partial<PlanSessionForRules> = {}
): PlanSessionForRules => ({
  dayNumber,
  title: opts.title ?? `Día ${dayNumber}`,
  stimulusCategory: opts.stimulusCategory ?? null,
  intensityLevel: opts.intensityLevel ?? null,
  estimatedMinutes: opts.estimatedMinutes ?? 60,
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

const violationsFor = (rule: string, all: PlanViolation[]) =>
  all.filter((v) => v.rule === rule);

// ==================== 3.1 — Orden intra-sesión ====================

describe('§3.1 — orden intra-sesión por intensidad', () => {
  it('happy: skill → strength → aerobic-base pasa', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('skill'), ex('strength'), ex('aerobic-base')]
        })
      ])
    ]);
    expect(violationsFor('3.1', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: aerobic-base antes de strength', () => {
    const p = plan([
      week(1, [
        session(1, { mainBlock: [ex('aerobic-base'), ex('strength')] })
      ])
    ]);
    const vs = violationsFor('3.1', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('blocking');
    expect(vs[0].details.kind).toBe('session-order-wrong');
    if (vs[0].details.kind === 'session-order-wrong') {
      expect(vs[0].details.got).toEqual(['aerobic-base', 'strength']);
    }
  });

  it('permisivo: mainBlock sin categorías no dispara', () => {
    const p = plan([week(1, [session(1, { mainBlock: [ex(), ex()] })])]);
    expect(violationsFor('3.1', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('permisivo: mainBlock con 1 solo ejercicio categorizado no dispara', () => {
    const p = plan([
      week(1, [session(1, { mainBlock: [ex('aerobic-base'), ex()] })])
    ]);
    expect(violationsFor('3.1', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.2 — Skills primero ====================

describe('§3.2 — skills en primeros ~30% del mainBlock', () => {
  it('happy: skill en index 0 de mainBlock pasa', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('skill'), ex('strength'), ex('strength'), ex('aerobic-base')]
        })
      ])
    ]);
    expect(violationsFor('3.2', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: skill al final del mainBlock', () => {
    const p = plan([
      week(1, [
        session(1, {
          estimatedMinutes: 60,
          // len=4, cutoff=2. skill@3 (>=2) → viola.
          // Nota: la 3.1 también dispara acá porque skill(1) después de
          // aerobic-base(5). Es intencional: 3.1 y 3.2 se solapan por
          // diseño (mensajes distintos al retry prompt).
          mainBlock: [ex('warmup'), ex('warmup'), ex('aerobic-base'), ex('skill')]
        })
      ])
    ]);
    const vs = violationsFor('3.2', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('blocking');
    if (vs[0].details.kind === 'skill-not-in-first-30-min') {
      expect(vs[0].details.sessionMinutesBeforeSkill).toBeGreaterThan(30);
    }
  });

  it('permisivo: sesión sin skill exercise no dispara', () => {
    const p = plan([
      week(1, [session(1, { mainBlock: [ex('strength'), ex('aerobic-base')] })])
    ]);
    expect(violationsFor('3.2', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.3 — No 3 hards consecutivos ====================

describe('§3.3 — no 3 días duros consecutivos', () => {
  const hardSession = (d: number) => session(d, { intensityLevel: 'hard' });
  const easySession = (d: number) => session(d, { intensityLevel: 'easy' });

  it('happy: hard-hard-easy-hard NO viola', () => {
    const p = plan([
      week(1, [hardSession(1), hardSession(2), easySession(3), hardSession(4)])
    ]);
    expect(violationsFor('3.3', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('EDGE CASE — hard-hard-rest-hard NO viola (rest rompe secuencia)', () => {
    const rest = (d: number) => session(d, { intensityLevel: 'easy', stimulusCategory: 'rest' });
    const p = plan([
      week(1, [hardSession(1), hardSession(2), rest(3), hardSession(4)])
    ]);
    expect(violationsFor('3.3', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('EDGE CASE — hard-hard-hard-easy SÍ viola (3 primeros consecutivos)', () => {
    const p = plan([
      week(1, [hardSession(1), hardSession(2), hardSession(3), easySession(4)])
    ]);
    const vs = violationsFor('3.3', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'consecutive-hard-days') {
      expect(vs[0].details.dayNumbers).toEqual([1, 2, 3]);
    }
  });

  it('EDGE CASE — hard@1,hard@3,hard@5 NO viola (no consecutivos)', () => {
    const p = plan([
      week(1, [hardSession(1), hardSession(3), hardSession(5)])
    ]);
    expect(violationsFor('3.3', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('EDGE CASE — hard cruzando semana (día 6+7 sem 1, día 1 sem 2) SÍ viola', () => {
    const p = plan([
      week(1, [hardSession(6), hardSession(7)]),
      week(2, [hardSession(1)])
    ]);
    const vs = violationsFor('3.3', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'consecutive-hard-days') {
      // globalDay: sem1/día6=6, sem1/día7=7, sem2/día1=8
      expect(vs[0].details.dayNumbers).toEqual([6, 7, 8]);
    }
  });

  it('permisivo: sesiones sin intensityLevel NO disparan', () => {
    const p = plan([
      week(1, [session(1), session(2), session(3)])
    ]);
    expect(violationsFor('3.3', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.4 — Recuperación ====================

describe('§3.4 — recuperación entre sesiones del mismo stimulus', () => {
  const strength = (d: number) => session(d, { stimulusCategory: 'strength' });

  it('happy: strength@1 y strength@3 (gap=2) pasa (min 2)', () => {
    const p = plan([week(1, [strength(1), strength(3)])]);
    expect(violationsFor('3.4', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: strength@1 y strength@2 (gap=1 < 2)', () => {
    const p = plan([week(1, [strength(1), strength(2)])]);
    const vs = violationsFor('3.4', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'insufficient-recovery-between-sessions') {
      expect(vs[0].details.stimulus).toBe('strength');
      expect(vs[0].details.daysBetween).toBe(1);
      expect(vs[0].details.minDaysRequired).toBe(2);
    }
  });

  it('viola: power-endurance con gap=2 (< 3 requerido)', () => {
    const pe = (d: number) => session(d, { stimulusCategory: 'power-endurance' });
    const p = plan([week(1, [pe(1), pe(3)])]);
    const vs = violationsFor('3.4', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
  });

  it('happy: strengths de días distintos y sesiones aerobic-base entre medio', () => {
    const aero = (d: number) => session(d, { stimulusCategory: 'aerobic-base' });
    const p = plan([week(1, [strength(1), aero(2), strength(3)])]);
    expect(violationsFor('3.4', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.6 — Strength en warmup/cooldown ====================

describe('§3.6 — strength/power/PE fuera de warmup y cooldown', () => {
  it('happy: strength en mainBlock pasa', () => {
    const p = plan([
      week(1, [session(1, { warmup: [ex('warmup')], mainBlock: [ex('strength')], cooldown: [ex('cooldown')] })])
    ]);
    expect(violationsFor('3.6', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: strength en cooldown', () => {
    const p = plan([
      week(1, [session(1, { cooldown: [ex('strength')] })])
    ]);
    const vs = violationsFor('3.6', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('blocking');
    expect(vs[0].location.block).toBe('cooldown');
  });

  it('viola: power-endurance en warmup', () => {
    const p = plan([
      week(1, [session(1, { warmup: [ex('power-endurance')] })])
    ]);
    const vs = violationsFor('3.6', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    expect(vs[0].location.block).toBe('warmup');
  });

  it('permisivo: warmup/cooldown sin categorías no dispara', () => {
    const p = plan([
      week(1, [session(1, { warmup: [ex()], cooldown: [ex()] })])
    ]);
    expect(violationsFor('3.6', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.7 — Deload cada 8-9 semanas ====================

describe('§3.7 — semana de descarga cada 8-9 semanas', () => {
  const buildWeeks = (n: number, deloadAt?: number[]) =>
    Array.from({ length: n }, (_, i) => {
      const wn = i + 1;
      const isDeload = deloadAt?.includes(wn);
      return week(wn, [session(1)], {
        phase: isDeload ? 'deload' : 'base',
        deloadWeek: isDeload
      });
    });

  it('happy: plan 9 semanas con deload en semana 8', () => {
    const p = plan(buildWeeks(9, [8]));
    expect(violationsFor('3.7', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: 10 semanas sin deload', () => {
    const p = plan(buildWeeks(10));
    const vs = violationsFor('3.7', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'missing-deload-after-block') {
      expect(vs[0].details.weeksSinceLastDeload).toBe(10);
      expect(vs[0].details.maxAllowed).toBe(9);
    }
  });

  it('happy: plan 12 semanas con deload@8 (streak 8 y luego 4)', () => {
    const p = plan(buildWeeks(12, [8]));
    expect(violationsFor('3.7', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('permisivo: plan sin phase ni deloadWeek en NINGUNA semana → no dispara', () => {
    const weeks: PlanWeekForRules[] = Array.from({ length: 20 }, (_, i) =>
      week(i + 1, [session(1)])
    );
    // sanity: los weeks tienen deloadWeek: false por defecto del builder.
    // Sobreescribimos a null para simular un plan legacy sin la info.
    for (const w of weeks) {
      w.deloadWeek = null;
      w.phase = null;
    }
    const p = plan(weeks);
    expect(violationsFor('3.7', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.8 — Orden macro ====================

describe('§3.8 — orden macro base → build → peak', () => {
  it('happy: base(1) → build(2) → peak(3)', () => {
    const p = plan([
      week(1, [session(1)], { phase: 'base' }),
      week(2, [session(1)], { phase: 'build' }),
      week(3, [session(1)], { phase: 'peak' })
    ]);
    expect(violationsFor('3.8', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: peak(1) → base(2) (retrocede)', () => {
    const p = plan([
      week(1, [session(1)], { phase: 'peak' }),
      week(2, [session(1)], { phase: 'base' })
    ]);
    const vs = violationsFor('3.8', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'macro-order-wrong') {
      expect(vs[0].details.violation).toContain('week 2');
    }
  });

  it('happy: deload entre medio NO rompe orden macro', () => {
    const p = plan([
      week(1, [session(1)], { phase: 'base' }),
      week(2, [session(1)], { phase: 'build' }),
      week(3, [session(1)], { phase: 'deload', deloadWeek: true }),
      week(4, [session(1)], { phase: 'build' }),
      week(5, [session(1)], { phase: 'peak' })
    ]);
    expect(violationsFor('3.8', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 3.9 — Anaeróbico requiere base ====================

describe('§3.9 — power-endurance requiere 6+ semanas aerobic-base previas', () => {
  it('happy: 6 semanas aerobic-base antes de primera PE', () => {
    const weeks: PlanWeekForRules[] = [];
    for (let i = 1; i <= 6; i++) {
      weeks.push(
        week(i, [session(1, { stimulusCategory: 'aerobic-base' })])
      );
    }
    weeks.push(week(7, [session(1, { stimulusCategory: 'power-endurance' })]));
    expect(
      violationsFor('3.9', section03SessionProgramming.check(plan(weeks)))
    ).toHaveLength(0);
  });

  it('desactivada para planes <6 semanas (decisión Giuliana 2026-07-13 · Deuda #14)', () => {
    // Un plan de 4 semanas con solo 3 aerobic-base + PE en semana 4
    // técnicamente cumpliría la condición semántica de §3.9, pero el check
    // se desactivó para planes cortos porque BilClimb produce planes de
    // 2-4 semanas (planDuration en user-profile.ts) y §3.9 fue diseñada
    // para macrociclos largos. La protección real contra PE en principiantes
    // es §1.2 ampliada (bloqueo estructural del stimulus).
    const weeks: PlanWeekForRules[] = [];
    for (let i = 1; i <= 3; i++) {
      weeks.push(
        week(i, [session(1, { stimulusCategory: 'aerobic-base' })])
      );
    }
    weeks.push(week(4, [session(1, { stimulusCategory: 'power-endurance' })]));
    expect(
      violationsFor('3.9', section03SessionProgramming.check(plan(weeks)))
    ).toHaveLength(0);
  });

  it('viola: plan de 7 semanas con solo 3 aerobic-base antes de PE (>=6 semanas activa el check)', () => {
    // Cuando el plan tiene 6+ semanas, §3.9 vuelve a aplicar. Este test
    // documenta que el desactivamiento es SOLO para planes cortos, no para
    // macrociclos largos.
    const weeks: PlanWeekForRules[] = [];
    for (let i = 1; i <= 3; i++) {
      weeks.push(week(i, [session(1, { stimulusCategory: 'aerobic-base' })]));
    }
    // semanas 4, 5, 6 sin aerobic-base
    for (let i = 4; i <= 6; i++) {
      weeks.push(week(i, [session(1, { stimulusCategory: 'strength' })]));
    }
    // semana 7 introduce PE
    weeks.push(week(7, [session(1, { stimulusCategory: 'power-endurance' })]));
    const vs = violationsFor(
      '3.9',
      section03SessionProgramming.check(plan(weeks))
    );
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'anaerobic-without-aerobic-base') {
      expect(vs[0].details.aerobicBaseWeeksBefore).toBe(3);
      expect(vs[0].details.minRequired).toBe(6);
      expect(vs[0].details.firstAnaerobicWeek).toBe(7);
    }
  });

  it('permisivo: plan sin power-endurance nunca dispara', () => {
    const weeks: PlanWeekForRules[] = [];
    for (let i = 1; i <= 3; i++) {
      weeks.push(week(i, [session(1, { stimulusCategory: 'strength' })]));
    }
    expect(
      violationsFor('3.9', section03SessionProgramming.check(plan(weeks)))
    ).toHaveLength(0);
  });
});

// ==================== 3.10 — Máx 3 hard/semana ====================

describe('§3.10 — máx 3 días duros por semana', () => {
  const h = (d: number) => session(d, { intensityLevel: 'hard' });
  const e = (d: number) => session(d, { intensityLevel: 'easy' });

  it('happy: 3 hard/semana pasa', () => {
    const p = plan([week(1, [h(1), e(2), h(3), e(4), h(5)])]);
    expect(violationsFor('3.10', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: 4 hard/semana', () => {
    const p = plan([week(1, [h(1), h(2), h(3), h(4), e(5)])]);
    const vs = violationsFor('3.10', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'too-many-hard-days-per-week') {
      expect(vs[0].details.hardCount).toBe(4);
      expect(vs[0].details.max).toBe(3);
    }
  });
});

// ==================== 3.20 — Máx 2 tipos alta intensidad/sesión ====================

describe('§3.20 — máx 2 tipos de alta intensidad por sesión', () => {
  it('happy: 1 tipo (todo strength) pasa', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('strength'), ex('strength'), ex('strength')]
        })
      ])
    ]);
    expect(violationsFor('3.20', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('happy: 2 tipos (strength + power) pasa', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('strength'), ex('power')]
        })
      ])
    ]);
    expect(violationsFor('3.20', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });

  it('viola: 3 tipos (strength + power + power-endurance)', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [ex('strength'), ex('power'), ex('power-endurance')]
        })
      ])
    ]);
    const vs = violationsFor('3.20', section03SessionProgramming.check(p));
    expect(vs).toHaveLength(1);
    if (vs[0].details.kind === 'more-than-two-high-intensity-elements') {
      expect(vs[0].details.elements.sort()).toEqual([
        'power',
        'power-endurance',
        'strength'
      ]);
      expect(vs[0].details.max).toBe(2);
    }
  });

  it('happy: elementos de baja intensidad no cuentan (skill + mobility no dispara)', () => {
    const p = plan([
      week(1, [
        session(1, {
          mainBlock: [
            ex('skill'),
            ex('mobility'),
            ex('aerobic-base'),
            ex('strength')
          ]
        })
      ])
    ]);
    expect(violationsFor('3.20', section03SessionProgramming.check(p))).toHaveLength(
      0
    );
  });
});

// ==================== 10.6 — Alternancia (advisory) ====================

describe('§10.6 — alternar heavy/light si 4+ días/semana', () => {
  const h = (d: number) => session(d, { intensityLevel: 'hard' });
  const e = (d: number) => session(d, { intensityLevel: 'easy' });

  it('happy: 4 días con hard/easy/hard/easy pasa', () => {
    const p = plan([week(1, [h(1), e(2), h(3), e(4)])]);
    expect(section10LoadAlternation.check(p)).toHaveLength(0);
  });

  it('viola advisory: 4 días con hard@1 y hard@2 consecutivos', () => {
    const p = plan([week(1, [h(1), h(2), e(3), e(4)])]);
    const vs = section10LoadAlternation.check(p);
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('advisory');
    expect(vs[0].rule).toBe('10.6');
    if (vs[0].details.kind === 'no-load-alternation') {
      expect(vs[0].details.consecutiveHeavyDays).toEqual([1, 2]);
      expect(vs[0].details.daysPerWeek).toBe(4);
    }
  });

  it('permisivo: 3 días/semana NO dispara aunque haya hard consecutivos', () => {
    const p = plan([week(1, [h(1), h(2), h(3)])]);
    expect(section10LoadAlternation.check(p)).toHaveLength(0);
  });
});

// ==================== Distinción blocking vs advisory ====================

describe('separación bloqueante vs advisory', () => {
  it('todas las §3.x son blocking', () => {
    const p = plan([
      week(1, [
        session(1, {
          intensityLevel: 'hard',
          mainBlock: [ex('aerobic-base'), ex('strength')] // 3.1 viola
        }),
        session(2, { intensityLevel: 'hard' }),
        session(3, { intensityLevel: 'hard' }) // 3.3 viola
      ])
    ]);
    const vs = section03SessionProgramming.check(p);
    expect(vs.length).toBeGreaterThan(0);
    for (const v of vs) {
      expect(v.severity).toBe('blocking');
    }
  });

  it('10.6 es advisory (no dispara regeneración)', () => {
    const h = (d: number) => session(d, { intensityLevel: 'hard' });
    const e = (d: number) => session(d, { intensityLevel: 'easy' });
    const p = plan([week(1, [h(1), h(2), e(3), e(4)])]);
    const vs = section10LoadAlternation.check(p);
    expect(vs).toHaveLength(1);
    expect(vs[0].severity).toBe('advisory');
  });
});
