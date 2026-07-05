import { describe, expect, it } from 'vitest';
import { SECTION_05_MESSAGES } from '../messages/section-05';
import type { ProfileForRules, Verdict } from '../types';
import { section05HealthDerivation } from './section-05-health-derivation';

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

describe("section-05 — 5.2 Historial de lesión de polea (proxy 'fingers')", () => {
  it("injuries.includes('fingers') dispara add-grip-restriction 'no-small-crimps-below-15mm'", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers'] })
    );
    const v = verdicts.find((x) => x.rule === '5.2');
    expect(v).toBeDefined();
    expect(v!.kind).toBe('add-grip-restriction');
    if (v!.kind === 'add-grip-restriction') {
      expect(v!.restriction).toBe('no-small-crimps-below-15mm');
    }
    expect(v!.userMessage).toBe(SECTION_05_MESSAGES.pulleyHistory.text);
    expect(v!.source).toBe(SECTION_05_MESSAGES.pulleyHistory.source);
  });

  it("injuries sin 'fingers' NO dispara 5.2", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['elbows', 'knees', 'back'] })
    );
    expect(verdicts.find((x) => x.rule === '5.2')).toBeUndefined();
  });

  it('injuries vacío NO dispara 5.2', () => {
    const verdicts = section05HealthDerivation.check(cleanProfile({ injuries: [] }));
    expect(verdicts.find((x) => x.rule === '5.2')).toBeUndefined();
  });

  it("dispara aunque haya otras injuries junto con 'fingers'", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers', 'shoulders', 'back'] })
    );
    expect(verdicts.find((x) => x.rule === '5.2')).toBeDefined();
  });
});

describe("section-05 — 5.3 Historial de codo (proxy 'elbows')", () => {
  it("injuries.includes('elbows') dispara 2 verdicts (priority + adjustment)", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['elbows'] })
    );
    const v53 = verdicts.filter((x) => x.rule === '5.3');
    expect(v53).toHaveLength(2);
  });

  it("emite add-training-priority 'extensors-before-traction'", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['elbows'] })
    );
    const v = verdicts.find(
      (x) => x.rule === '5.3' && x.kind === 'add-training-priority'
    );
    expect(v).toBeDefined();
    if (v && v.kind === 'add-training-priority') {
      expect(v.priority).toBe('extensors-before-traction');
    }
  });

  it("emite add-intensity-adjustment 'reduce-traction-volume'", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['elbows'] })
    );
    const v = verdicts.find(
      (x) => x.rule === '5.3' && x.kind === 'add-intensity-adjustment'
    );
    expect(v).toBeDefined();
    if (v && v.kind === 'add-intensity-adjustment') {
      expect(v.adjustment).toBe('reduce-traction-volume');
    }
  });

  it("injuries sin 'elbows' NO dispara 5.3", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers', 'shoulders'] })
    );
    expect(verdicts.filter((x) => x.rule === '5.3')).toHaveLength(0);
  });

  it('mensaje y source verbatim del Doc 02 §5.3', () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['elbows'] })
    );
    for (const v of verdicts.filter((x) => x.rule === '5.3')) {
      expect(v.userMessage).toBe(SECTION_05_MESSAGES.elbowHistory.text);
      expect(v.source).toBe(SECTION_05_MESSAGES.elbowHistory.source);
    }
  });
});

describe("section-05 — 5.4 Sueño (SOLO 'bad' dispara)", () => {
  it("sleep === 'bad' dispara add-intensity-adjustment 'reduce-below-baseline'", () => {
    const verdicts = section05HealthDerivation.check(cleanProfile({ sleep: 'bad' }));
    const v = verdicts.find((x) => x.rule === '5.4');
    expect(v).toBeDefined();
    expect(v!.kind).toBe('add-intensity-adjustment');
    if (v!.kind === 'add-intensity-adjustment') {
      expect(v!.adjustment).toBe('reduce-below-baseline');
    }
  });

  it("sleep === 'regular' (5-7h) NO dispara 5.4 (decisión de Giuliana)", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ sleep: 'regular' })
    );
    expect(verdicts.find((x) => x.rule === '5.4')).toBeUndefined();
  });

  it("sleep === 'good' NO dispara 5.4", () => {
    const verdicts = section05HealthDerivation.check(cleanProfile({ sleep: 'good' }));
    expect(verdicts.find((x) => x.rule === '5.4')).toBeUndefined();
  });

  it("sleep vacío NO dispara 5.4 (asume ok por default)", () => {
    const verdicts = section05HealthDerivation.check(cleanProfile({ sleep: '' }));
    expect(verdicts.find((x) => x.rule === '5.4')).toBeUndefined();
  });

  it('mensaje y source verbatim del Doc 02 §5.4', () => {
    const verdicts = section05HealthDerivation.check(cleanProfile({ sleep: 'bad' }));
    const v = verdicts.find((x) => x.rule === '5.4')!;
    expect(v.userMessage).toBe(SECTION_05_MESSAGES.poorSleep.text);
    expect(v.source).toBe(SECTION_05_MESSAGES.poorSleep.source);
  });
});

describe('section-05 — combinaciones', () => {
  it("perfil limpio (sin injuries, sleep='good') NO emite verdicts", () => {
    const verdicts = section05HealthDerivation.check(cleanProfile());
    expect(verdicts).toHaveLength(0);
  });

  it("worst-case (injuries=['fingers','elbows'] + sleep='bad') → 4 verdicts (5.2 + 2× 5.3 + 5.4)", () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers', 'elbows'], sleep: 'bad' })
    );
    expect(verdicts).toHaveLength(4);
    expect(verdicts.filter((x) => x.rule === '5.2')).toHaveLength(1);
    expect(verdicts.filter((x) => x.rule === '5.3')).toHaveLength(2);
    expect(verdicts.filter((x) => x.rule === '5.4')).toHaveLength(1);
  });

  it("dolor 4 en dedos + injuries=['fingers'] (dolor actual Y historial) → §1.3 lo maneja aparte; §5.2 dispara igual", () => {
    // section-05 no depende de currentFingerPain — dispara por historial (injuries),
    // no por dolor actual. Los 2 conviven sin conflicto.
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers'], currentFingerPain: 4 })
    );
    expect(verdicts.find((x) => x.rule === '5.2')).toBeDefined();
  });
});

describe('section-05 — metadata del módulo', () => {
  it('section y ruleIds correctos', () => {
    expect(section05HealthDerivation.section).toBe('section-05');
    expect([...section05HealthDerivation.ruleIds]).toEqual(['5.2', '5.3', '5.4']);
  });
});

describe("section-05 — tipos de verdict (garantía de que no se filtran block-* de §1)", () => {
  it('todos los verdicts de section-05 son add-* (no block-*)', () => {
    const verdicts = section05HealthDerivation.check(
      cleanProfile({ injuries: ['fingers', 'elbows'], sleep: 'bad' })
    );
    const kinds = new Set(verdicts.map((v: Verdict) => v.kind));
    expect(kinds.has('block-categories')).toBe(false);
    expect(kinds.has('block-zone')).toBe(false);
    kinds.forEach((k) => {
      expect(['add-grip-restriction', 'add-training-priority', 'add-intensity-adjustment']).toContain(k);
    });
  });
});
