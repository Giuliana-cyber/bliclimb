// Bloque 3 (audit-360) — Opción A: el desglose escalada/entrenamiento
// llega al prompt del motor. Sin desglose, el LLM veía sólo el total y
// no sabía cuántos días eran de escalada vs gym.

import { describe, expect, it } from 'vitest';
import { profileToPrompt } from './route';
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
