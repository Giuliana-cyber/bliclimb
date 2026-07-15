import { describe, expect, it } from 'vitest';
import { ChatRequestSchema, UserProfileSchema } from './user-profile';

const minimalValidProfile = {
  id: 'profile-1',
  character: 'bill' as const,
  name: 'Test',
  age: '26-35',
  climbingTime: '1to3',
  daysPerWeek: 3,
  planDuration: 4,
  // Cierre Deuda #15 (2026-07-14): equipment refine exige 'gym'. Todos los
  // fixtures válidos del schema incluyen gym; los tests de ausencia de gym
  // van explícitos abajo.
  equipment: ['gym'],
  createdAt: '2026-06-15T00:00:00Z',
  updatedAt: '2026-06-15T00:00:00Z'
};

describe('UserProfileSchema', () => {
  it('acepta un perfil mínimo válido y aplica defaults', () => {
    const result = UserProfileSchema.safeParse(minimalValidProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disciplines).toEqual([]);
      expect(result.data.equipment).toEqual(['gym']);
      expect(result.data.trainingAggressiveness).toBe('balanced');
      expect(result.data.currentFingerPain).toBe(0);
    }
  });

  // Cierre Deuda #15 (2026-07-14): equipment refine exige 'gym' server-side.
  describe('equipment refine · gym requerido', () => {
    it('rechaza equipment sin gym (home + pullup_bar)', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        equipment: ['home', 'pullup_bar']
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'equipment');
        expect(issue).toBeDefined();
        expect(issue?.message).toMatch(/gym/i);
      }
    });

    it('rechaza equipment sin gym (rock + home, escalador de roca puro)', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        equipment: ['rock', 'home']
      });
      expect(result.success).toBe(false);
    });

    it('rechaza equipment vacío (default) — sin gym no pasa', () => {
      const { equipment: _drop, ...noEquip } = minimalValidProfile;
      const result = UserProfileSchema.safeParse(noEquip);
      expect(result.success).toBe(false);
    });

    it('acepta equipment con gym + otros', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        equipment: ['gym', 'home', 'pullup_bar', 'hangboard']
      });
      expect(result.success).toBe(true);
    });
  });

  it('rechaza payload basura con detalle de issues', () => {
    const result = UserProfileSchema.safeParse({ random: 'garbage' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('id');
      expect(paths).toContain('character');
      expect(paths).toContain('climbingTime');
      expect(paths).toContain('daysPerWeek');
      expect(paths).toContain('planDuration');
    }
  });

  it('rechaza planDuration fuera de [4,8,12]', () => {
    const result = UserProfileSchema.safeParse({ ...minimalValidProfile, planDuration: 6 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'planDuration');
      expect(issue).toBeDefined();
    }
  });

  it('rechaza daysPerWeek fuera de 1..7', () => {
    const r1 = UserProfileSchema.safeParse({ ...minimalValidProfile, daysPerWeek: 0 });
    const r2 = UserProfileSchema.safeParse({ ...minimalValidProfile, daysPerWeek: 8 });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('rechaza character fuera de bill/senda', () => {
    const result = UserProfileSchema.safeParse({
      ...minimalValidProfile,
      character: 'random'
    });
    expect(result.success).toBe(false);
  });

  it('rechaza dolor de dedos > 10', () => {
    const result = UserProfileSchema.safeParse({
      ...minimalValidProfile,
      currentFingerPain: 15
    });
    expect(result.success).toBe(false);
  });

  describe('fuerza (B1)', () => {
    it('acepta números válidos en todos los campos de fuerza', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        pullupsBodyweight: 12,
        pullupsAddedWeight5Reps: 15,
        hangboard20mmSeconds: 18,
        hangboard20mmAddedWeight7s: 10,
        benchPress1Rm: 85,
        squat1Rm: 120,
        deadlift1Rm: 150
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pullupsBodyweight).toBe(12);
        expect(result.data.deadlift1Rm).toBe(150);
      }
    });

    it('aplica null por default cuando los campos de fuerza no vienen', () => {
      const result = UserProfileSchema.safeParse(minimalValidProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pullupsBodyweight).toBeNull();
        expect(result.data.hangboard20mmSeconds).toBeNull();
        expect(result.data.benchPress1Rm).toBeNull();
      }
    });

    it('rechaza dominadas negativas', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        pullupsBodyweight: -3
      });
      expect(result.success).toBe(false);
    });

    it('rechaza dominadas > 50', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        pullupsBodyweight: 99
      });
      expect(result.success).toBe(false);
    });

    it('rechaza segundos negativos en hangboard', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        hangboard20mmSeconds: -1
      });
      expect(result.success).toBe(false);
    });

    it('rechaza 1RM negativo', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        benchPress1Rm: -10
      });
      expect(result.success).toBe(false);
    });

    it('acepta null explícito', () => {
      const result = UserProfileSchema.safeParse({
        ...minimalValidProfile,
        pullupsBodyweight: null,
        deadlift1Rm: null
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('ChatRequestSchema', () => {
  it('acepta un payload mínimo con un solo message', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'hola' }]
    });
    expect(result.success).toBe(true);
  });

  it('rechaza messages vacío', () => {
    const result = ChatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it('rechaza message sin content', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: '' }]
    });
    expect(result.success).toBe(false);
  });

  it('rechaza role inválido', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'system', content: 'hola' }]
    });
    expect(result.success).toBe(false);
  });

  it('rechaza payload sin messages', () => {
    const result = ChatRequestSchema.safeParse({ profile: { id: 'x' } });
    expect(result.success).toBe(false);
  });

  it('acepta character opcional bill/senda', () => {
    const r1 = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'hi' }],
      character: 'bill'
    });
    const r2 = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'hi' }],
      character: 'senda'
    });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});
