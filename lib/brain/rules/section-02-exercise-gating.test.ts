import { describe, expect, it } from 'vitest';
import type { BlockedCategory } from '../types';
import { isExerciseBlocked } from '../types';
import {
  _internals,
  translateCategoriesToGating
} from './section-02-exercise-gating';

function categories(...items: BlockedCategory[]): Set<BlockedCategory> {
  return new Set(items);
}

describe('section-02 — familias directas (HB-*, CB-*)', () => {
  it("categoría 'hangboard' agrega prefijo HB-", () => {
    const { matcher } = translateCategoriesToGating(categories('hangboard'));
    expect(matcher.prefixes.has('HB-')).toBe(true);
    expect(matcher.exactIds.size).toBe(0);
  });

  it("categoría 'campus' agrega prefijo CB-", () => {
    const { matcher } = translateCategoriesToGating(categories('campus'));
    expect(matcher.prefixes.has('CB-')).toBe(true);
  });

  it("categoría 'hangboard-intense' bloquea HB- entero (conservativo, sin taxonomía Intensidad canónica todavía)", () => {
    const { matcher } = translateCategoriesToGating(categories('hangboard-intense'));
    expect(matcher.prefixes.has('HB-')).toBe(true);
  });
});

describe('section-02 — HIT (IDs exactos)', () => {
  it("categoría 'hit' agrega FM-014 + PF-FM-005", () => {
    const { matcher } = translateCategoriesToGating(categories('hit'));
    expect(matcher.exactIds.has('FM-014')).toBe(true);
    expect(matcher.exactIds.has('PF-FM-005')).toBe(true);
    expect(matcher.prefixes.size).toBe(0);
  });
});

describe('section-02 — full-crimp (grip restriction, NO IDs)', () => {
  it("categoría 'full-crimp' agrega gripRestriction 'no-full-crimp'", () => {
    const { matcher, gripRestrictions } = translateCategoriesToGating(
      categories('full-crimp')
    );
    expect(gripRestrictions.has('no-full-crimp')).toBe(true);
    // Ningún ID bloqueado — es restricción de agarre, no bloqueo de ejercicios
    expect(matcher.exactIds.size).toBe(0);
    expect(matcher.prefixes.size).toBe(0);
  });
});

describe('section-02 — finger-training-any (cubre-todo)', () => {
  it("categoría 'finger-training-any' bloquea HB- + CB- (canales que cargan dedos con dispositivo)", () => {
    const { matcher } = translateCategoriesToGating(categories('finger-training-any'));
    expect(matcher.prefixes.has('HB-')).toBe(true);
    expect(matcher.prefixes.has('CB-')).toBe(true);
  });
});

describe('section-02 — spec de Parte B (test-maximo, dominadas-con-lastre) hardcodeada', () => {
  it("categoría 'pullups-weighted' bloquea FT-002 + FTE-002", () => {
    const { matcher } = translateCategoriesToGating(categories('pullups-weighted'));
    expect(matcher.exactIds.has('FT-002')).toBe(true);
    expect(matcher.exactIds.has('FTE-002')).toBe(true);
  });

  it("categoría 'max-tests' bloquea los 15 IDs de la spec test-maximo", () => {
    const { matcher } = translateCategoriesToGating(categories('max-tests'));
    expect(matcher.exactIds.size).toBe(15);
    // Muestreo de la spec (fase-3-subfase-2-etiquetado.md)
    for (const id of [
      'FD-006',
      'FD-007',
      'FD-008',
      'FD-009',
      'HB-007',
      'CD-009',
      'EV-CF',
      'EV-GRIP-PULL',
      'EV-FM-002',
      'EV-FM-004',
      'FTE-002',
      'EVT-PO-001',
      'EV-CB-001',
      'EV-CB-003',
      'EV-CB-004'
    ]) {
      expect(matcher.exactIds.has(id)).toBe(true);
    }
  });

  it("categoría 'power-max' bloquea PO-DEADSTOP + PO-POWERPU (Deuda #10)", () => {
    const { matcher, gripRestrictions } = translateCategoriesToGating(categories('power-max'));
    expect(matcher.exactIds.size).toBe(2);
    expect(matcher.exactIds.has('PO-DEADSTOP')).toBe(true);
    expect(matcher.exactIds.has('PO-POWERPU')).toBe(true);
    // power-max no agrega prefijos ni grip restrictions.
    expect(matcher.prefixes.size).toBe(0);
    expect(gripRestrictions.size).toBe(0);
  });
});

describe('section-02 — vacío / composición', () => {
  it('sin categorías → matcher vacío + no grip restrictions', () => {
    const { matcher, gripRestrictions } = translateCategoriesToGating(new Set());
    expect(matcher.exactIds.size).toBe(0);
    expect(matcher.prefixes.size).toBe(0);
    expect(gripRestrictions.size).toBe(0);
  });

  it('múltiples categorías se acumulan sin duplicados (Set semantics)', () => {
    const { matcher } = translateCategoriesToGating(
      categories('hit', 'pullups-weighted', 'max-tests')
    );
    // FTE-002 aparece en max-tests Y en pullups-weighted → sigue siendo 1 sola entrada
    expect(matcher.exactIds.has('FTE-002')).toBe(true);
    // FM-014 (hit) + PF-FM-005 (hit) + 15 test-maximo + 2 pullups-weighted, con
    // FTE-002 duplicado entre pullups-weighted y max-tests → 15 + 2 + 2 - 1 = 18.
    expect(matcher.exactIds.size).toBe(18);
  });

  it('menor de 16 típico (§1.1 → 6 categorías post-Deuda #10) bloquea HB- + CB- + FM-014 + PF-FM-005 + no-full-crimp + PO-DEADSTOP + PO-POWERPU', () => {
    const { matcher, gripRestrictions } = translateCategoriesToGating(
      categories('hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any', 'power-max')
    );
    expect(matcher.prefixes.has('HB-')).toBe(true);
    expect(matcher.prefixes.has('CB-')).toBe(true);
    expect(matcher.exactIds.has('FM-014')).toBe(true);
    expect(matcher.exactIds.has('PF-FM-005')).toBe(true);
    expect(gripRestrictions.has('no-full-crimp')).toBe(true);
    // power-max (Deuda #10) añade 2 IDs específicos
    expect(matcher.exactIds.has('PO-DEADSTOP')).toBe(true);
    expect(matcher.exactIds.has('PO-POWERPU')).toBe(true);
  });

  it('novato <2 años típico (§1.2 → 6 categorías post-Deuda #10) bloquea HB- + CB- + FM-014 + PF-FM-005 + 2 pullups-weighted + 15 test-maximo + 2 power-max (con dedupe)', () => {
    const { matcher } = translateCategoriesToGating(
      categories('hangboard-intense', 'campus', 'hit', 'pullups-weighted', 'max-tests', 'power-max')
    );
    expect(matcher.prefixes.has('HB-')).toBe(true);
    expect(matcher.prefixes.has('CB-')).toBe(true);
    // 2 hit + 2 pullups-weighted + 15 test-maximo con FTE-002 duplicado + 2 power-max = 20
    expect(matcher.exactIds.size).toBe(20);
    expect(matcher.exactIds.has('PO-DEADSTOP')).toBe(true);
    expect(matcher.exactIds.has('PO-POWERPU')).toBe(true);
  });
});

describe('isExerciseBlocked (helper)', () => {
  it('matchea por ID exacto', () => {
    const { matcher } = translateCategoriesToGating(categories('hit'));
    expect(isExerciseBlocked('FM-014', matcher)).toBe(true);
    expect(isExerciseBlocked('PF-FM-005', matcher)).toBe(true);
    expect(isExerciseBlocked('FM-013', matcher)).toBe(false);
  });

  it('matchea por prefijo de familia (HB-*, CB-*)', () => {
    const { matcher } = translateCategoriesToGating(categories('hangboard', 'campus'));
    expect(isExerciseBlocked('HB-001', matcher)).toBe(true);
    expect(isExerciseBlocked('HB-066', matcher)).toBe(true);
    expect(isExerciseBlocked('CB-005', matcher)).toBe(true);
    // Otro prefijo no matchea
    expect(isExerciseBlocked('FD-001', matcher)).toBe(false);
    expect(isExerciseBlocked('TA-C004', matcher)).toBe(false);
  });

  it('matcher vacío → nada bloqueado', () => {
    const { matcher } = translateCategoriesToGating(new Set());
    expect(isExerciseBlocked('HB-001', matcher)).toBe(false);
    expect(isExerciseBlocked('FM-014', matcher)).toBe(false);
  });

  it('doble cobertura (HB-007 en HB- prefix Y en test-maximo lista) → sigue bloqueado (idempotente)', () => {
    const { matcher } = translateCategoriesToGating(categories('hangboard', 'max-tests'));
    expect(isExerciseBlocked('HB-007', matcher)).toBe(true);
  });
});

describe('section-02 — _internals para trazabilidad de spec', () => {
  it('HIT_IDS son exactamente los 2 de la spec', () => {
    expect([..._internals.HIT_IDS].sort()).toEqual(['FM-014', 'PF-FM-005']);
  });

  it('TEST_MAXIMO_IDS son 15 (spec fase-3-subfase-2-etiquetado.md)', () => {
    expect(_internals.TEST_MAXIMO_IDS.length).toBe(15);
  });

  it('PULLUPS_WEIGHTED_IDS son 2 (spec)', () => {
    expect([..._internals.PULLUPS_WEIGHTED_IDS].sort()).toEqual(['FT-002', 'FTE-002']);
  });
});
