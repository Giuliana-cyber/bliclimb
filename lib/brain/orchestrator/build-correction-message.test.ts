import { describe, expect, it } from 'vitest';
import { buildCorrectionMessage } from './build-correction-message';
import type { PlanViolation } from '../types';

const violation = (
  rule: PlanViolation['rule'],
  section: PlanViolation['section'],
  severity: PlanViolation['severity'],
  location: PlanViolation['location'],
  details: PlanViolation['details']
): PlanViolation => ({
  rule,
  section,
  severity,
  location,
  details,
  ruleSummary: 'summary',
  source: 'src'
});

describe('buildCorrectionMessage — específico, ubicación + acción concreta', () => {
  it('gated-exercise-slipped: incluye ubicación + dos salidas (quitar vs corregir etiqueta)', () => {
    const v = violation(
      '1.gating',
      'section-01',
      'blocking',
      { weekNumber: 2, dayNumber: 1, block: 'mainBlock', exerciseIndex: 3 },
      {
        kind: 'gated-exercise-slipped',
        exerciseName: 'MaxHang 20mm',
        blockedCategory: 'hangboard',
        profileRule: '1.1'
      }
    );
    const msg = buildCorrectionMessage([v]);
    expect(msg).toContain('semana 2');
    expect(msg).toContain('día 1');
    expect(msg).toContain('mainBlock');
    expect(msg).toContain('MaxHang 20mm');
    expect(msg).toContain('hangboard');
    expect(msg).toContain('1.1');
    // Dos salidas para over-tag:
    expect(msg.toLowerCase()).toContain('quitalo');
    expect(msg.toLowerCase()).toContain('corregí blockcategory a null');
  });

  it('consecutive-hard-days: incluye los días exactos', () => {
    const v = violation(
      '3.3',
      'section-03',
      'blocking',
      { weekNumber: 1, dayNumber: 1 },
      { kind: 'consecutive-hard-days', dayNumbers: [1, 2, 3] }
    );
    const msg = buildCorrectionMessage([v]);
    expect(msg).toContain('1, 2, 3');
  });

  it('too-many-hard-days-per-week: incluye counts', () => {
    const v = violation(
      '3.10',
      'section-03',
      'blocking',
      { weekNumber: 2 },
      { kind: 'too-many-hard-days-per-week', hardCount: 4, max: 3 }
    );
    const msg = buildCorrectionMessage([v]);
    expect(msg).toContain('Semana 2');
    expect(msg).toContain('4');
    expect(msg).toContain('máximo: 3');
  });

  it('missing-extensor-work: distingue epicondilitis vs threshold', () => {
    const vEpi = violation(
      '14.2',
      'section-14',
      'blocking',
      { weekNumber: 1 },
      {
        kind: 'missing-extensor-work',
        tractionDaysInWeek: 1,
        hasEpicondylitisHistory: true,
        reason: 'epicondylitis-history'
      }
    );
    const vThr = violation(
      '14.2',
      'section-14',
      'blocking',
      { weekNumber: 2 },
      {
        kind: 'missing-extensor-work',
        tractionDaysInWeek: 3,
        hasEpicondylitisHistory: false,
        reason: 'traction-threshold'
      }
    );
    const msgEpi = buildCorrectionMessage([vEpi]);
    const msgThr = buildCorrectionMessage([vThr]);
    expect(msgEpi).toContain('epicondilitis');
    expect(msgThr).toContain('3 días de tracción');
  });
});

describe('buildCorrectionMessage — agrupación por regla, cap 5 items', () => {
  it('agrupa por rule con heading', () => {
    const v1 = violation(
      '3.10',
      'section-03',
      'blocking',
      { weekNumber: 1 },
      { kind: 'too-many-hard-days-per-week', hardCount: 4, max: 3 }
    );
    const v2 = violation(
      '3.3',
      'section-03',
      'blocking',
      { weekNumber: 1, dayNumber: 1 },
      { kind: 'consecutive-hard-days', dayNumbers: [1, 2, 3] }
    );
    const msg = buildCorrectionMessage([v1, v2]);
    expect(msg).toContain('Días duros consecutivos');
    expect(msg).toContain('Demasiados días duros por semana');
  });

  it('cap 5 items por regla con "y N más"', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      violation(
        '3.3',
        'section-03',
        'blocking',
        { weekNumber: i + 1, dayNumber: 1 },
        { kind: 'consecutive-hard-days', dayNumbers: [1, 2, 3] }
      )
    );
    const msg = buildCorrectionMessage(many);
    expect(msg).toContain('y 3 caso/s más');
  });
});

describe('buildCorrectionMessage — advisory al final, marcado', () => {
  it('advisory §10.6 va en sección separada opcional', () => {
    const blocking = violation(
      '3.3',
      'section-03',
      'blocking',
      { weekNumber: 1, dayNumber: 1 },
      { kind: 'consecutive-hard-days', dayNumbers: [1, 2, 3] }
    );
    const advisory = violation(
      '10.6',
      'section-10',
      'advisory',
      { weekNumber: 1, dayNumber: 2 },
      {
        kind: 'no-load-alternation',
        daysPerWeek: 4,
        consecutiveHeavyDays: [1, 2]
      }
    );
    const msg = buildCorrectionMessage([blocking], [advisory]);
    expect(msg).toContain('Advisorys');
    expect(msg).toContain('opcional');
    expect(msg.indexOf('Advisorys')).toBeGreaterThan(msg.indexOf('Días duros'));
  });

  it('sin violations → string vacío (defensivo)', () => {
    expect(buildCorrectionMessage([], [])).toBe('');
  });
});

describe('buildCorrectionMessage — orden estable', () => {
  it('ordena por weekNumber → dayNumber → exerciseIndex dentro de cada regla', () => {
    const v3 = violation(
      '1.gating',
      'section-01',
      'blocking',
      { weekNumber: 2, dayNumber: 1, block: 'mainBlock', exerciseIndex: 0 },
      { kind: 'gated-exercise-slipped', exerciseName: 'B', blockedCategory: 'hangboard', profileRule: '1.1' }
    );
    const v1 = violation(
      '1.gating',
      'section-01',
      'blocking',
      { weekNumber: 1, dayNumber: 1, block: 'mainBlock', exerciseIndex: 0 },
      { kind: 'gated-exercise-slipped', exerciseName: 'A', blockedCategory: 'hangboard', profileRule: '1.1' }
    );
    const v2 = violation(
      '1.gating',
      'section-01',
      'blocking',
      { weekNumber: 1, dayNumber: 3, block: 'mainBlock', exerciseIndex: 0 },
      { kind: 'gated-exercise-slipped', exerciseName: 'C', blockedCategory: 'hangboard', profileRule: '1.1' }
    );
    const msg = buildCorrectionMessage([v3, v1, v2]);
    expect(msg.indexOf('"A"')).toBeLessThan(msg.indexOf('"C"'));
    expect(msg.indexOf('"C"')).toBeLessThan(msg.indexOf('"B"'));
  });
});
