import { describe, expect, it, vi } from 'vitest';
import { NullLogSink } from './logging';
import type { BlockLogEvent, LogSink, ProfileForRules } from './types';
import { evaluateProfile } from './validator';

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

describe('evaluateProfile — happy path', () => {
  it('perfil limpio → BlockingContext vacío (incluye blockedExercises + gripRestrictions vacíos tras section-02)', () => {
    const ctx = evaluateProfile(cleanProfile(), { log: new NullLogSink() });
    expect(ctx.blockedCategories.size).toBe(0);
    expect(ctx.blockedZones.size).toBe(0);
    expect(ctx.blockedExercises.exactIds.size).toBe(0);
    expect(ctx.blockedExercises.prefixes.size).toBe(0);
    expect(ctx.gripRestrictions.size).toBe(0);
    expect(ctx.derivationMessages).toHaveLength(0);
    expect(ctx.ruleHits).toHaveLength(0);
  });
});

describe('evaluateProfile — integración con section-02 (traducción categorías → IDs)', () => {
  it('u16 → HB- + CB- + FM-014 + PF-FM-005 bloqueados + no-full-crimp', () => {
    const ctx = evaluateProfile(cleanProfile({ age: 'u16' }), { log: new NullLogSink() });
    expect(ctx.blockedExercises.prefixes.has('HB-')).toBe(true);
    expect(ctx.blockedExercises.prefixes.has('CB-')).toBe(true);
    expect(ctx.blockedExercises.exactIds.has('FM-014')).toBe(true);
    expect(ctx.blockedExercises.exactIds.has('PF-FM-005')).toBe(true);
    expect(ctx.gripRestrictions.has('no-full-crimp')).toBe(true);
  });

  it("climbingTime 'start' (<2 años) → HB- + CB- + FM-014 + PF-FM-005 + 2 pullups-weighted + 15 test-maximo (deduped)", () => {
    const ctx = evaluateProfile(cleanProfile({ climbingTime: 'start' }), {
      log: new NullLogSink()
    });
    expect(ctx.blockedExercises.prefixes.has('HB-')).toBe(true);
    expect(ctx.blockedExercises.prefixes.has('CB-')).toBe(true);
    // 2 (hit) + 2 (pullups-weighted) + 15 (max-tests) - 1 (FTE-002 dedupe) = 18
    expect(ctx.blockedExercises.exactIds.size).toBe(18);
    // gripRestriction NO se activa en §1.2 (no incluye full-crimp)
    expect(ctx.gripRestrictions.size).toBe(0);
  });

  it("climbingTime 'more3' (adulto experimentado) sin dolor → sin bloqueos", () => {
    const ctx = evaluateProfile(cleanProfile({ climbingTime: 'more3' }), {
      log: new NullLogSink()
    });
    expect(ctx.blockedExercises.exactIds.size).toBe(0);
    expect(ctx.blockedExercises.prefixes.size).toBe(0);
  });

  it('perfil solo con dolor (sin categorías por §1.1/§1.2) → sin IDs bloqueados (dolor bloquea ZONAS, no ejercicios)', () => {
    const ctx = evaluateProfile(cleanProfile({ currentFingerPain: 5 }), {
      log: new NullLogSink()
    });
    expect(ctx.blockedZones.has('fingers-pulleys')).toBe(true);
    expect(ctx.blockedExercises.exactIds.size).toBe(0);
    expect(ctx.blockedExercises.prefixes.size).toBe(0);
  });
});

describe('evaluateProfile — integración con section-05 (derivación de salud)', () => {
  it("perfil limpio → trainingPriorities + intensityAdjustments vacíos", () => {
    const ctx = evaluateProfile(cleanProfile(), { log: new NullLogSink() });
    expect(ctx.trainingPriorities.size).toBe(0);
    expect(ctx.intensityAdjustments.size).toBe(0);
  });

  it("injuries=['fingers'] → gripRestrictions incluye 'no-small-crimps-below-15mm' (§5.2)", () => {
    const ctx = evaluateProfile(cleanProfile({ injuries: ['fingers'] }), {
      log: new NullLogSink()
    });
    expect(ctx.gripRestrictions.has('no-small-crimps-below-15mm')).toBe(true);
    expect(ctx.ruleHits).toContainEqual({
      rule: '5.2',
      kind: 'add-grip-restriction'
    });
  });

  it("injuries=['elbows'] → trainingPriorities + intensityAdjustments populados (§5.3)", () => {
    const ctx = evaluateProfile(cleanProfile({ injuries: ['elbows'] }), {
      log: new NullLogSink()
    });
    expect(ctx.trainingPriorities.has('extensors-before-traction')).toBe(true);
    expect(ctx.intensityAdjustments.has('reduce-traction-volume')).toBe(true);
    expect(ctx.ruleHits.filter((h) => h.rule === '5.3')).toHaveLength(2);
  });

  it("sleep='bad' → intensityAdjustments incluye 'reduce-below-baseline' (§5.4)", () => {
    const ctx = evaluateProfile(cleanProfile({ sleep: 'bad' }), {
      log: new NullLogSink()
    });
    expect(ctx.intensityAdjustments.has('reduce-below-baseline')).toBe(true);
    expect(ctx.ruleHits).toContainEqual({
      rule: '5.4',
      kind: 'add-intensity-adjustment'
    });
  });

  it("sleep='regular' NO dispara §5.4 (decisión firme)", () => {
    const ctx = evaluateProfile(cleanProfile({ sleep: 'regular' }), {
      log: new NullLogSink()
    });
    expect(ctx.intensityAdjustments.has('reduce-below-baseline')).toBe(false);
  });

  it("perfil compuesto (u16 + injuries=['fingers','elbows'] + sleep='bad') acumula §1.1 + §5.2 + §5.3 + §5.4", () => {
    const ctx = evaluateProfile(
      cleanProfile({
        age: 'u16',
        injuries: ['fingers', 'elbows'],
        sleep: 'bad'
      }),
      { log: new NullLogSink() }
    );
    // §1.1 (5 categorías) + section-02 traduce
    expect(ctx.blockedCategories.size).toBe(5);
    expect(ctx.blockedExercises.prefixes.has('HB-')).toBe(true);
    // §5.2 + section-01 §1.1 ambas contribuyen a gripRestrictions
    expect(ctx.gripRestrictions.has('no-full-crimp')).toBe(true); // de §1.1
    expect(ctx.gripRestrictions.has('no-small-crimps-below-15mm')).toBe(true); // de §5.2
    // §5.3
    expect(ctx.trainingPriorities.has('extensors-before-traction')).toBe(true);
    expect(ctx.intensityAdjustments.has('reduce-traction-volume')).toBe(true);
    // §5.4
    expect(ctx.intensityAdjustments.has('reduce-below-baseline')).toBe(true);
    // ruleHits registra los 5 verdicts: 1.1 + 5.2 + 5.3 (2×) + 5.4
    expect(ctx.ruleHits).toHaveLength(5);
  });
});

describe('evaluateProfile — logging de kinds nuevos de sub-fase 3', () => {
  it('logBlock incluye restriction/priority/adjustment según kind', () => {
    const events: import('./types').BlockLogEvent[] = [];
    const mockSink: import('./types').LogSink = {
      logBlock: (e) => events.push(e)
    };

    evaluateProfile(
      cleanProfile({ injuries: ['fingers', 'elbows'], sleep: 'bad' }),
      { log: mockSink }
    );

    const log_5_2 = events.find((e) => e.rule === '5.2')!;
    expect(log_5_2.kind).toBe('add-grip-restriction');
    expect(log_5_2.restriction).toBe('no-small-crimps-below-15mm');
    expect(log_5_2.priority).toBeUndefined();

    const priorityLog = events.find((e) => e.kind === 'add-training-priority')!;
    expect(priorityLog.rule).toBe('5.3');
    expect(priorityLog.priority).toBe('extensors-before-traction');
    expect(priorityLog.restriction).toBeUndefined();

    const log_5_4 = events.find((e) => e.rule === '5.4')!;
    expect(log_5_4.kind).toBe('add-intensity-adjustment');
    expect(log_5_4.adjustment).toBe('reduce-below-baseline');
  });
});

describe('evaluateProfile — acumulación de bloqueos', () => {
  it('u16 → categories contiene las 5 de §1.1', () => {
    const ctx = evaluateProfile(cleanProfile({ age: 'u16' }), { log: new NullLogSink() });
    expect(Array.from(ctx.blockedCategories).sort()).toEqual(
      ['hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any'].sort()
    );
    expect(ctx.ruleHits).toContainEqual({ rule: '1.1', kind: 'block-categories' });
  });

  it('dolor 4 en dedos y hombro → 2 zonas bloqueadas + 2 mensajes de derivación', () => {
    const ctx = evaluateProfile(
      cleanProfile({ currentFingerPain: 4, currentShoulderPain: 4 }),
      { log: new NullLogSink() }
    );
    expect(ctx.blockedZones.size).toBe(2);
    expect(ctx.blockedZones.has('fingers-pulleys')).toBe(true);
    expect(ctx.blockedZones.has('shoulder')).toBe(true);
    expect(ctx.derivationMessages).toHaveLength(2);
  });

  it('u16 + dolor 4 en dedos → checkpoint de sub-fase 1: 2 verdicts (1.1 + 1.3)', () => {
    const ctx = evaluateProfile(
      cleanProfile({ age: 'u16', currentFingerPain: 4 }),
      { log: new NullLogSink() }
    );
    // Verdict 1.1 acumula categorías
    expect(ctx.blockedCategories.size).toBe(5);
    // Verdict 1.3 acumula zona
    expect(ctx.blockedZones.has('fingers-pulleys')).toBe(true);
    // 2 mensajes de derivación (1 de §1.1, 1 de §1.3)
    expect(ctx.derivationMessages).toHaveLength(2);
    // ruleHits registra ambos
    expect(ctx.ruleHits).toHaveLength(2);
    const rules = ctx.ruleHits.map((h) => h.rule).sort();
    expect(rules).toEqual(['1.1', '1.3']);
  });
});

describe('evaluateProfile — logging', () => {
  it('llama a LogSink.logBlock una vez por verdict con campos correctos', () => {
    const events: BlockLogEvent[] = [];
    const mockSink: LogSink = { logBlock: (e) => events.push(e) };

    evaluateProfile(cleanProfile({ age: 'u16', currentFingerPain: 4 }), {
      log: mockSink,
      profileId: 'test-profile-uuid'
    });

    expect(events).toHaveLength(2);
    // Log de 1.1
    const log_1_1 = events.find((e) => e.rule === '1.1')!;
    expect(log_1_1.section).toBe('section-01');
    expect(log_1_1.profileId).toBe('test-profile-uuid');
    expect(log_1_1.kind).toBe('block-categories');
    expect(log_1_1.categories?.sort()).toEqual(
      ['hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any'].sort()
    );
    expect(log_1_1.zone).toBeUndefined();
    expect(log_1_1.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Log de 1.3
    const log_1_3 = events.find((e) => e.rule === '1.3')!;
    expect(log_1_3.kind).toBe('block-zone');
    expect(log_1_3.zone).toBe('fingers-pulleys');
    expect(log_1_3.categories).toBeUndefined();
  });

  it('perfil limpio → no llama logBlock', () => {
    const spy = vi.fn();
    evaluateProfile(cleanProfile(), { log: { logBlock: spy } });
    expect(spy).not.toHaveBeenCalled();
  });

  it('sin profileId → loguea con profileId: null', () => {
    const events: BlockLogEvent[] = [];
    const mockSink: LogSink = { logBlock: (e) => events.push(e) };
    evaluateProfile(cleanProfile({ age: 'u16' }), { log: mockSink });
    expect(events[0].profileId).toBeNull();
  });
});

describe('evaluateProfile — inmutabilidad', () => {
  it('no muta el profile de entrada', () => {
    const profile = cleanProfile({ age: 'u16', currentFingerPain: 3 });
    const snapshot = JSON.stringify(profile);
    evaluateProfile(profile, { log: new NullLogSink() });
    expect(JSON.stringify(profile)).toBe(snapshot);
  });
});
