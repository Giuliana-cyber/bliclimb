import { describe, expect, it } from 'vitest';
import {
  deriveElbowPain,
  deriveFingerPain,
  deriveShoulderPain
} from './derive-pain-signals';

describe('deriveFingerPain · regla max(check-in, lesión ? 5 : 0)', () => {
  it('sin nada → 0', () => {
    expect(deriveFingerPain(null, null, null)).toBe(0);
    expect(deriveFingerPain(['none'], null, null)).toBe(0);
  });

  it('lesión declarada fingers, sin check-in, sin legacy → 5', () => {
    expect(deriveFingerPain(['fingers'], null, null)).toBe(5);
  });

  it('lesión declarada fingers + check-in fingerPain=2 → max(2, 5) = 5', () => {
    expect(deriveFingerPain(['fingers'], { fingerPain: 2 }, null)).toBe(5);
  });

  it('lesión declarada fingers + check-in fingerPain=8 → max(8, 5) = 8', () => {
    expect(deriveFingerPain(['fingers'], { fingerPain: 8 }, null)).toBe(8);
  });

  it('sin lesión + check-in fingerPain=3 → 3 (dispara §1.3 dedos)', () => {
    expect(deriveFingerPain(['none'], { fingerPain: 3 }, null)).toBe(3);
  });

  it('sin lesión + sin check-in + legacy currentFingerPain=4 → 4 (compat pre-cambio)', () => {
    expect(deriveFingerPain(['none'], null, { currentFingerPain: 4 })).toBe(4);
  });

  it('sin lesión + check-in presente + legacy también → prevalece check-in', () => {
    expect(
      deriveFingerPain(['none'], { fingerPain: 1 }, { currentFingerPain: 4 })
    ).toBe(1);
  });

  it('lesión + sin check-in + legacy alto → max(legacy, 5) = max(7, 5) = 7', () => {
    expect(
      deriveFingerPain(['fingers'], null, { currentFingerPain: 7 })
    ).toBe(7);
  });

  it('check-in fingerPain=0 explícito con lesión → 5 (lesión gana sobre 0)', () => {
    expect(deriveFingerPain(['fingers'], { fingerPain: 0 }, null)).toBe(5);
  });
});

describe('deriveElbowPain · solo lesión (sin check-in de codo)', () => {
  it('sin nada → 0', () => {
    expect(deriveElbowPain(null, null)).toBe(0);
  });

  it('lesión elbows → 5', () => {
    expect(deriveElbowPain(['elbows'], null)).toBe(5);
  });

  it('legacy currentElbowPain=3 sin lesión → 3', () => {
    expect(deriveElbowPain(['none'], { currentElbowPain: 3 })).toBe(3);
  });

  it('lesión + legacy alto → max(legacy, 5) = 8', () => {
    expect(deriveElbowPain(['elbows'], { currentElbowPain: 8 })).toBe(8);
  });

  it('lesión fingers pero no elbows → 0 (no cruzado)', () => {
    expect(deriveElbowPain(['fingers'], null)).toBe(0);
  });
});

describe('deriveShoulderPain · solo lesión', () => {
  it('lesión shoulders → 5', () => {
    expect(deriveShoulderPain(['shoulders'], null)).toBe(5);
  });

  it('sin lesión → 0', () => {
    expect(deriveShoulderPain(['none'], null)).toBe(0);
  });

  it('legacy currentShoulderPain con lesión → max', () => {
    expect(deriveShoulderPain(['shoulders'], { currentShoulderPain: 2 })).toBe(5);
    expect(deriveShoulderPain(['shoulders'], { currentShoulderPain: 9 })).toBe(9);
  });

  it('lesión back o knee NO cuenta como shoulder', () => {
    expect(deriveShoulderPain(['back'], null)).toBe(0);
    expect(deriveShoulderPain(['knees'], null)).toBe(0);
  });
});

describe('integración · umbral §1.3 (≥3 dispara block-zone)', () => {
  it('lesión declarada = 5 → siempre dispara §1.3 en esa zona', () => {
    expect(deriveFingerPain(['fingers'], null, null)).toBeGreaterThanOrEqual(3);
    expect(deriveElbowPain(['elbows'], null)).toBeGreaterThanOrEqual(3);
    expect(deriveShoulderPain(['shoulders'], null)).toBeGreaterThanOrEqual(3);
  });

  it('check-in fingerPain=2 sin lesión → NO dispara §1.3', () => {
    expect(deriveFingerPain(['none'], { fingerPain: 2 }, null)).toBeLessThan(3);
  });
});
