import { describe, expect, it } from 'vitest';
import { SECTION_01_MESSAGES } from '../messages/section-01';
import type { ProfileForRules, Verdict } from '../types';
import { section01ProfileFilters } from './section-01-profile-filters';

// Helper: perfil "clean adult" que no dispara ninguna regla.
function cleanProfile(overrides: Partial<ProfileForRules> = {}): ProfileForRules {
  return {
    age: '26-35',
    climbingTime: 'more3',
    currentFingerPain: 0,
    currentElbowPain: 0,
    currentShoulderPain: 0,
    injuries: [],
    sleep: 'good',
    ...overrides
  };
}

describe('section-01 — 1.1 Menores de 16', () => {
  it("age === 'u16' dispara 1.1 con las 5 categorías canónicas", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ age: 'u16' }));
    const v = verdicts.find((v) => v.rule === '1.1');
    expect(v).toBeDefined();
    expect(v!.kind).toBe('block-categories');
    if (v!.kind === 'block-categories') {
      expect(v!.categories.sort()).toEqual(
        ['hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any'].sort()
      );
    }
    expect(v!.userMessage).toBe(SECTION_01_MESSAGES.minorsAge.text);
    expect(v!.source).toBe(SECTION_01_MESSAGES.minorsAge.source);
  });

  it("age === '16-25' NO dispara 1.1", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ age: '16-25' }));
    expect(verdicts.find((v) => v.rule === '1.1')).toBeUndefined();
  });

  it("age vacío NO dispara 1.1 (asume adulto por default)", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ age: '' }));
    expect(verdicts.find((v) => v.rule === '1.1')).toBeUndefined();
  });

  it("age '46+' NO dispara 1.1", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ age: '46+' }));
    expect(verdicts.find((v) => v.rule === '1.1')).toBeUndefined();
  });
});

describe('section-01 — 1.2 Menos de 2 años de práctica', () => {
  it.each(['start', 'less1', '1to3'])(
    "climbingTime === '%s' dispara 1.2",
    (climbingTime) => {
      const verdicts = section01ProfileFilters.check(cleanProfile({ climbingTime }));
      const v = verdicts.find((v) => v.rule === '1.2');
      expect(v).toBeDefined();
      expect(v!.kind).toBe('block-categories');
      if (v!.kind === 'block-categories') {
        expect(v!.categories.sort()).toEqual(
          ['hangboard-intense', 'campus', 'hit', 'pullups-weighted', 'max-tests'].sort()
        );
      }
      expect(v!.userMessage).toBe(SECTION_01_MESSAGES.practiceYears.text);
      expect(v!.source).toBe(SECTION_01_MESSAGES.practiceYears.source);
    }
  );

  it("climbingTime === 'more3' NO dispara 1.2 (único unlock)", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ climbingTime: 'more3' }));
    expect(verdicts.find((v) => v.rule === '1.2')).toBeUndefined();
  });

  it("climbingTime vacío DISPARA 1.2 (conservativo — sin dato asumimos <2 años)", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ climbingTime: '' }));
    expect(verdicts.find((v) => v.rule === '1.2')).toBeDefined();
  });
});

describe('section-01 — 1.3 Dolor activo, umbral 3+ estricto', () => {
  it.each([
    [0, false],
    [1, false],
    [2, false],
    [3, true],
    [4, true],
    [10, true]
  ] as Array<[number, boolean]>)(
    'currentFingerPain %d → dispara: %s (umbral 3 estricto)',
    (pain, shouldFire) => {
      const verdicts = section01ProfileFilters.check(cleanProfile({ currentFingerPain: pain }));
      const zones = verdicts
        .filter((v): v is Verdict & { kind: 'block-zone' } => v.kind === 'block-zone')
        .map((v) => v.zone);
      if (shouldFire) {
        expect(zones).toContain('fingers-pulleys');
      } else {
        expect(zones).not.toContain('fingers-pulleys');
      }
    }
  );

  it('currentElbowPain >= 3 dispara zona elbow', () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ currentElbowPain: 3 }));
    const v = verdicts.find((x) => x.rule === '1.3' && x.kind === 'block-zone' && x.zone === 'elbow');
    expect(v).toBeDefined();
  });

  it('currentShoulderPain >= 3 dispara zona shoulder', () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ currentShoulderPain: 5 }));
    const v = verdicts.find((x) => x.rule === '1.3' && x.kind === 'block-zone' && x.zone === 'shoulder');
    expect(v).toBeDefined();
  });

  it('dolor 2/10 en las 3 zonas NO dispara nada (umbral estricto)', () => {
    const verdicts = section01ProfileFilters.check(
      cleanProfile({ currentFingerPain: 2, currentElbowPain: 2, currentShoulderPain: 2 })
    );
    expect(verdicts.filter((v) => v.rule === '1.3')).toHaveLength(0);
  });

  it('dolor 4 en dedos y hombro → 2 verdicts', () => {
    const verdicts = section01ProfileFilters.check(
      cleanProfile({ currentFingerPain: 4, currentShoulderPain: 4 })
    );
    const zoneVerdicts = verdicts.filter((v) => v.rule === '1.3');
    expect(zoneVerdicts).toHaveLength(2);
    const zones = zoneVerdicts
      .filter((v): v is Verdict & { kind: 'block-zone' } => v.kind === 'block-zone')
      .map((v) => v.zone)
      .sort();
    expect(zones).toEqual(['fingers-pulleys', 'shoulder']);
  });

  it('mensaje y source son los del Doc 02 §1.3', () => {
    const verdicts = section01ProfileFilters.check(cleanProfile({ currentFingerPain: 3 }));
    const v = verdicts.find((x) => x.rule === '1.3');
    expect(v!.userMessage).toBe(SECTION_01_MESSAGES.activePain.text);
    expect(v!.source).toBe(SECTION_01_MESSAGES.activePain.source);
  });
});

describe('section-01 — combinaciones', () => {
  it("perfil u16 con dolor 4 en dedos → 2 verdicts (1.1 + 1.3 fingers-pulleys)", () => {
    const verdicts = section01ProfileFilters.check(
      cleanProfile({ age: 'u16', currentFingerPain: 4 })
    );
    expect(verdicts).toHaveLength(2);
    const rules = verdicts.map((v) => v.rule).sort();
    expect(rules).toEqual(['1.1', '1.3']);
  });

  it("perfil clean (adulto, +3 años, sin dolor) NO emite verdicts", () => {
    const verdicts = section01ProfileFilters.check(cleanProfile());
    expect(verdicts).toHaveLength(0);
  });

  it("perfil worst-case (u16 + start + dolor 5 en 3 zonas) → 5 verdicts (1.1 + 1.2 + 3× 1.3)", () => {
    const verdicts = section01ProfileFilters.check(
      cleanProfile({
        age: 'u16',
        climbingTime: 'start',
        currentFingerPain: 5,
        currentElbowPain: 5,
        currentShoulderPain: 5
      })
    );
    expect(verdicts).toHaveLength(5);
    expect(verdicts.filter((v) => v.rule === '1.1')).toHaveLength(1);
    expect(verdicts.filter((v) => v.rule === '1.2')).toHaveLength(1);
    expect(verdicts.filter((v) => v.rule === '1.3')).toHaveLength(3);
  });
});

// -------------------- Fase 4 Pieza 2 — variante de mensaje §1.3 por coach --------------------

describe('section-01 — §1.3 mensaje adaptado por coach (Opción 1)', () => {
  it('character="bill" con dolor 4 → verdict.userMessage === texto neutro histórico', () => {
    const v = section01ProfileFilters
      .check(cleanProfile({ currentFingerPain: 4, character: 'bill' }))
      .find((x) => x.rule === '1.3');
    expect(v).toBeDefined();
    expect(v!.userMessage).toBe(SECTION_01_MESSAGES.activePain.text);
    expect(v!.userMessage).toContain('Bill no es médico');
  });

  it('character="senda" con dolor 4 → verdict.userMessage === Derivación 3 verbatim', () => {
    const v = section01ProfileFilters
      .check(cleanProfile({ currentFingerPain: 4, character: 'senda' }))
      .find((x) => x.rule === '1.3');
    expect(v).toBeDefined();
    expect(v!.userMessage).toBe(SECTION_01_MESSAGES.activePainSenda.text);
    expect(v!.userMessage).toContain('Eso que me cuentas no suena a molestia normal');
    expect(v!.userMessage).toContain('Que alguien lo revise es cuidarte, no exagerar');
  });

  it('sin character (undefined) → default Bill', () => {
    const v = section01ProfileFilters
      .check(cleanProfile({ currentFingerPain: 4 }))
      .find((x) => x.rule === '1.3');
    expect(v!.userMessage).toBe(SECTION_01_MESSAGES.activePain.text);
  });

  it('dolor 2 (bajo umbral) + character="senda" → cero verdicts (detección intacta)', () => {
    const verdicts = section01ProfileFilters.check(
      cleanProfile({ currentFingerPain: 2, character: 'senda' })
    );
    expect(verdicts).toHaveLength(0);
  });

  it('Senda con dolor en 3 zonas → 3 verdicts, TODOS con Derivación 3', () => {
    const verdicts = section01ProfileFilters
      .check(
        cleanProfile({
          currentFingerPain: 4,
          currentElbowPain: 4,
          currentShoulderPain: 4,
          character: 'senda'
        })
      )
      .filter((v) => v.rule === '1.3');
    expect(verdicts).toHaveLength(3);
    for (const v of verdicts) {
      expect(v.userMessage).toBe(SECTION_01_MESSAGES.activePainSenda.text);
    }
  });
});

describe('section-01 — metadata del módulo', () => {
  it('section y ruleIds correctos', () => {
    expect(section01ProfileFilters.section).toBe('section-01');
    expect([...section01ProfileFilters.ruleIds]).toEqual(['1.1', '1.2', '1.3']);
  });
});
