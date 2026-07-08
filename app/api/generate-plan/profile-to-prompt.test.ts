// Bloque 3 (audit-360) — Opción A: el desglose escalada/entrenamiento
// llega al prompt del motor. Sin desglose, el LLM veía sólo el total y
// no sabía cuántos días eran de escalada vs gym.

import { describe, expect, it } from 'vitest';
import { profileToPrompt } from './profile-to-prompt';
import type { UserProfile } from '@/lib/profile';

// Base mínima válida — sólo los campos que profileToPrompt lee.
function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  // Bloque 4 audit-360: fixture alineado con el UserProfile recortado.
  return {
    id: 'test-id',
    character: 'bill',
    name: 'Test',
    age: '26-35',
    sex: '',
    weight: null,
    climbingTime: '1to3',
    disciplines: ['sport'],
    level: 'intermediate',
    setting: 'indoor',
    injuries: [],
    injuryNotes: '',
    sleep: 'good',
    daysPerWeek: 3,
    equipment: ['gym'],
    equipmentNotes: '',
    goal: '',
    goals: ['grade'],
    goalDescription: '',
    sessionDuration: 90,
    maxSessionDuration: 120,
    availableDays: ['monday', 'wednesday', 'friday'],
    accessToCampusBoard: false,
    accessToHangboard: false,
    accessToTRX: false,
    accessToWeights: false,
    pullUpAbility: '',
    fingerTrainingExperience: '',
    currentFingerPain: 0,
    currentShoulderPain: 0,
    currentElbowPain: 0,
    wantsConservativePlan: false,
    trainingAggressiveness: 'balanced',
    sleepQuality: 'good',
    injuryDescription: '',
    planDuration: 4,
    pullupsBodyweight: null,
    pullupsAddedWeight5Reps: null,
    hangboard20mmSeconds: null,
    hangboard20mmAddedWeight7s: null,
    createdAt: '2026-07-07T00:00:00Z',
    updatedAt: '2026-07-07T00:00:00Z',
    ...overrides
  };
}

describe('profileToPrompt — Opción A (H-03): desglose de días al motor', () => {
  it('con climbingDaysPerWeek=2 y trainingDaysPerWeek=1 → línea explícita en el prompt', () => {
    const prompt = profileToPrompt(
      baseProfile({
        daysPerWeek: 3,
        climbingDaysPerWeek: 2,
        trainingDaysPerWeek: 1
      })
    );
    expect(prompt).toContain('Días por semana: 3');
    expect(prompt).toContain(
      'Desglose: Escalada 2 días · Entrenamiento extra 1 días'
    );
  });

  it('con 4 días de escalada y 0 de gym → línea con "0 días" honesta', () => {
    const prompt = profileToPrompt(
      baseProfile({
        daysPerWeek: 4,
        climbingDaysPerWeek: 4,
        trainingDaysPerWeek: 0
      })
    );
    expect(prompt).toContain('Desglose: Escalada 4 días · Entrenamiento extra 0 días');
  });

  it('con 0 escalada y 3 de gym → línea con "0 días" en escalada', () => {
    const prompt = profileToPrompt(
      baseProfile({
        daysPerWeek: 3,
        climbingDaysPerWeek: 0,
        trainingDaysPerWeek: 3
      })
    );
    expect(prompt).toContain('Desglose: Escalada 0 días · Entrenamiento extra 3 días');
  });

  it('perfil viejo (sin los dos campos) → NO agrega la línea de desglose', () => {
    const prompt = profileToPrompt(baseProfile({ daysPerWeek: 3 }));
    expect(prompt).toContain('Días por semana: 3');
    expect(prompt).not.toContain('Desglose:');
  });

  it('sólo uno de los dos definidos → NO agrega la línea (necesita ambos para ser honesta)', () => {
    const prompt = profileToPrompt(
      baseProfile({ daysPerWeek: 3, climbingDaysPerWeek: 3 })
    );
    expect(prompt).not.toContain('Desglose:');
  });
});

// Audit-360 · rediseño lesión (07/07/2026): el "Dolor actual" que ve el LLM
// se deriva por las mismas reglas que §1.3 del brain (lesión = 5/10 en zona,
// check-in.fingerPain como override de dedos). Sin esta derivación, el LLM
// veía "codo 0/10" y "Lesiones: elbows" simultáneamente — señal contradictoria.
describe('profileToPrompt — dolor derivado por lesión y check-in (rediseño lesión)', () => {
  it('injuries=["elbows"] sin check-in → prompt dice "codo 5/10" (no 0/10)', () => {
    const prompt = profileToPrompt(
      baseProfile({
        injuries: ['elbows'],
        currentFingerPain: 0,
        currentShoulderPain: 0,
        currentElbowPain: 0
      })
    );
    expect(prompt).toContain('Lesiones: elbows');
    expect(prompt).toContain('codo 5/10');
    expect(prompt).not.toContain('codo 0/10');
  });

  it('injuries=["shoulders"] → prompt dice "hombro 5/10"', () => {
    const prompt = profileToPrompt(
      baseProfile({
        injuries: ['shoulders'],
        currentFingerPain: 0,
        currentShoulderPain: 0,
        currentElbowPain: 0
      })
    );
    expect(prompt).toContain('hombro 5/10');
  });

  it('injuries=["fingers"] con check-in fingerPain=3 → prompt dice "dedos 5/10" (lesión gana)', () => {
    const prompt = profileToPrompt(
      baseProfile({
        injuries: ['fingers'],
        currentFingerPain: 0
      }),
      { fingerPain: 3 }
    );
    expect(prompt).toContain('dedos 5/10');
  });

  it('sin lesión + check-in fingerPain=4 → prompt dice "dedos 4/10"', () => {
    const prompt = profileToPrompt(
      baseProfile({
        injuries: ['none'],
        currentFingerPain: 0
      }),
      { fingerPain: 4 }
    );
    expect(prompt).toContain('dedos 4/10');
    expect(prompt).toContain('codo 0/10');
    expect(prompt).toContain('hombro 0/10');
  });

  it('sin lesión + sin check-in + legacy currentXPain > 0 → fallback legacy', () => {
    // Compat: users pre-rediseño con dolor guardado en el perfil.
    const prompt = profileToPrompt(
      baseProfile({
        injuries: ['none'],
        currentFingerPain: 2,
        currentElbowPain: 3,
        currentShoulderPain: 1
      })
    );
    expect(prompt).toContain('dedos 2/10');
    expect(prompt).toContain('codo 3/10');
    expect(prompt).toContain('hombro 1/10');
  });

  it('caller viejo que no pasa latestCheckIn → default null, no rompe', () => {
    const prompt = profileToPrompt(
      baseProfile({ injuries: ['elbows'] })
    );
    expect(prompt).toContain('codo 5/10');
  });
});
