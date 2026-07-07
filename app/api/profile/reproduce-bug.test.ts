// TEMPORARY diagnostic — remove after root cause found (audit-360 bug #1)
// Reproductor forense: los 3 tests demuestran que ProfileSchema.safeParse
// acepta el payload EXACTO del cliente y que toDbRow lo mapea todo. Cuando
// aparezcan los logs de prod y clavemos la causa raíz, este archivo se
// borra junto con la instrumentación de route.ts.

import { describe, expect, it } from 'vitest';
import { ProfileSchema, toDbRow } from './schema';

// Este es LITERALMENTE el JSON.stringify(dbPayload) que sale de
// app/onboarding/page.tsx handleSubmit tras completar el onboarding con
// datos "Diego" completos.
const REAL_ONBOARDING_PAYLOAD_JSON = JSON.stringify({
  character: 'bill',
  name: 'Diego',
  age: '26-35',
  sex: 'male',
  weight: 72,
  climbingTime: '1to3',
  disciplines: ['sport', 'boulder'],
  level: 'intermediate',
  setting: 'indoor',
  goals: ['grade'],
  goalDescription: '',
  equipment: ['gym', 'hangboard'],
  equipmentNotes: '',
  daysPerWeek: 4,
  climbingDaysPerWeek: 3,
  trainingDaysPerWeek: 1,
  availableDays: ['monday', 'wednesday', 'friday', 'saturday'],
  sessionDuration: 90,
  maxSessionDuration: 120,
  planDuration: 4,
  injuries: ['none'],
  injuryDescription: '',
  injuryNotes: '',
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  wantsConservativePlan: false,
  trainingAggressiveness: 'balanced',
  sleepQuality: 'good',
  sleep: 'good',
  pullUpAbility: '4to8',
  fingerTrainingExperience: 'structured',
  pullupsBodyweight: 8,
  pullupsAddedWeight5Reps: null,
  hangboard20mmSeconds: null,
  hangboard20mmAddedWeight7s: null
});

describe('reproducción bug #1 · POST /api/profile en prod', () => {
  it('paso 1: JSON.parse del body real', () => {
    const raw = JSON.parse(REAL_ONBOARDING_PAYLOAD_JSON) as Record<string, unknown>;
    console.log('  → raw.climbingDaysPerWeek:', raw.climbingDaysPerWeek);
    console.log('  → raw.disciplines:', raw.disciplines);
    console.log('  → raw.setting:', raw.setting);
    console.log('  → raw.availableDays:', raw.availableDays);
    console.log('  → raw.maxSessionDuration:', raw.maxSessionDuration);
    console.log('  → raw.pullUpAbility:', raw.pullUpAbility);
    console.log('  → raw.fingerTrainingExperience:', raw.fingerTrainingExperience);
    expect(raw.climbingDaysPerWeek).toBe(3);
    expect(raw.disciplines).toEqual(['sport', 'boulder']);
    expect(raw.setting).toBe('indoor');
  });

  it('paso 2: ProfileSchema.safeParse acepta el payload y preserva TODOS los campos', () => {
    const raw = JSON.parse(REAL_ONBOARDING_PAYLOAD_JSON) as unknown;
    const parsed = ProfileSchema.safeParse(raw);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.log('  ERROR de Zod:', parsed.error.issues);
      return;
    }

    console.log('  → parsed.climbingDaysPerWeek:', parsed.data.climbingDaysPerWeek);
    console.log('  → parsed.disciplines:', parsed.data.disciplines);
    console.log('  → parsed.setting:', parsed.data.setting);
    console.log('  → parsed.availableDays:', parsed.data.availableDays);
    console.log('  → parsed.maxSessionDuration:', parsed.data.maxSessionDuration);
    console.log('  → parsed.pullUpAbility:', parsed.data.pullUpAbility);
    console.log('  → parsed.fingerTrainingExperience:', parsed.data.fingerTrainingExperience);

    expect(parsed.data.climbingDaysPerWeek).toBe(3);
    expect(parsed.data.trainingDaysPerWeek).toBe(1);
    expect(parsed.data.disciplines).toEqual(['sport', 'boulder']);
    expect(parsed.data.setting).toBe('indoor');
    expect(parsed.data.availableDays).toEqual([
      'monday',
      'wednesday',
      'friday',
      'saturday'
    ]);
    expect(parsed.data.maxSessionDuration).toBe(120);
    expect(parsed.data.pullUpAbility).toBe('4to8');
    expect(parsed.data.fingerTrainingExperience).toBe('structured');
  });

  it('paso 3: toDbRow mapea a snake_case y NO omite los campos nuevos', () => {
    const raw = JSON.parse(REAL_ONBOARDING_PAYLOAD_JSON) as unknown;
    const parsed = ProfileSchema.safeParse(raw);
    if (!parsed.success) throw new Error('Zod falló');

    const row = toDbRow(parsed.data);

    // Diagnóstico completo: lista TODAS las keys del row que va a Supabase.
    console.log('  → row keys:', Object.keys(row).sort());
    console.log('  → row.name:', row.name);
    console.log('  → row.climbing_days_per_week:', row.climbing_days_per_week);
    console.log('  → row.training_days_per_week:', row.training_days_per_week);
    console.log('  → row.disciplines:', row.disciplines);
    console.log('  → row.setting:', row.setting);
    console.log('  → row.available_days:', row.available_days);
    console.log('  → row.max_session_duration:', row.max_session_duration);
    console.log('  → row.pull_up_ability:', row.pull_up_ability);
    console.log('  → row.finger_training_experience:', row.finger_training_experience);

    // Los "viejos" (que sabemos que en prod SÍ se persistieron).
    expect(row).toHaveProperty('name', 'Diego');
    expect(row).toHaveProperty('age', '26-35');
    expect(row).toHaveProperty('weight', 72);

    // Los "nuevos" (que en prod NO se persistieron).
    expect(row).toHaveProperty('climbing_days_per_week', 3);
    expect(row).toHaveProperty('training_days_per_week', 1);
    expect(row).toHaveProperty('disciplines', ['sport', 'boulder']);
    expect(row).toHaveProperty('setting', 'indoor');
    expect(row).toHaveProperty('available_days', [
      'monday',
      'wednesday',
      'friday',
      'saturday'
    ]);
    expect(row).toHaveProperty('max_session_duration', 120);
    expect(row).toHaveProperty('pull_up_ability', '4to8');
    expect(row).toHaveProperty('finger_training_experience', 'structured');
  });
});
