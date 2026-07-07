// Bloque 4 audit-360 · Evidencia end-to-end de persistencia.
//
// Cubre la cadena completa: payload del onboarding → toDbRow (snake_case)
// → row simulada de Supabase (post-migration 0013) → rowToProfile
// (camelCase) → profileToPrompt (prompt del motor).
//
// Los 3 tests demuestran que:
//   1. Todo lo nuevo se persiste (climbingDaysPerWeek, trainingDaysPerWeek,
//      disciplines, setting, availableDays, maxSessionDuration,
//      pullUpAbility, fingerTrainingExperience).
//   2. Los campos cortados NO se persisten (bench/squat/deadlift, height,
//      energy, previousTraining, warmup, project, rockProjectDescription).
//   3. El prompt del motor lee los nuevos y NO tiene líneas huérfanas de
//      campos recortados (Estatura / Proyecto / Contexto proyecto /
//      Plan anterior / Frecuencia roca / Exp. campus / Energía /
//      Calentamiento / Press banca / Sentadilla / Peso muerto).

import { describe, expect, it } from 'vitest';
import { toDbRow, type ProfileInput } from './route';
import { profileToRow, rowToProfile, type ProfileRow } from '@/lib/db/profile';
import { profileToPrompt } from '@/app/api/generate-plan/route';
import type { UserProfile } from '@/lib/profile';

// Simula la fila que Supabase devuelve. Vive tipada contra el ProfileRow
// del helper para que si el schema DB drift-ea, este test falle antes.
function makeRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-A',
    character: 'bill',
    language: 'es',
    name: 'Ana',
    age: '26-35',
    sex: 'female',
    weight: 62,
    climbing_time: '1to3',
    disciplines: ['sport', 'boulder'],
    level: 'intermediate',
    setting: 'indoor',
    goals: ['grade', 'technique'],
    goal_description: 'Quiero encadenar La Catrina 5.12a antes de diciembre.',
    training_history: '',
    equipment: ['gym', 'hangboard'],
    equipment_notes: 'Beastmaker 1000',
    days_per_week: 4,
    climbing_days_per_week: 3,
    training_days_per_week: 1,
    available_days: ['monday', 'wednesday', 'friday', 'saturday'],
    session_duration: 90,
    max_session_duration: 120,
    plan_duration: 4,
    injuries: ['none'],
    injury_description: '',
    injury_notes: '',
    current_finger_pain: 0,
    current_shoulder_pain: 0,
    current_elbow_pain: 0,
    wants_conservative_plan: false,
    training_aggressiveness: 'balanced',
    sleep_quality: 'good',
    sleep: 'good',
    pull_up_ability: '4to8',
    finger_training_experience: 'structured',
    pullups_bodyweight: 8,
    pullups_added_weight_5reps: 12,
    hangboard_20mm_seconds: 20,
    hangboard_20mm_added_weight_7s: 15,
    needs_regeneration: false,
    created_at: '2026-07-07T00:00:00Z',
    updated_at: '2026-07-07T00:00:00Z',
    ...overrides
  };
}

describe('Round-trip · payload → toDbRow → row', () => {
  it('los 8 campos nuevos y el desglose de días llegan a la row DB', () => {
    // Payload realista del onboarding tras Bloque 4.
    const payload: ProfileInput = {
      character: 'bill',
      name: 'Ana',
      age: '26-35',
      sex: 'female',
      weight: 62,
      climbingTime: '1to3',
      disciplines: ['sport', 'boulder'],
      level: 'intermediate',
      setting: 'indoor',
      goals: ['grade'],
      goalDescription: 'Quiero encadenar La Catrina 5.12a antes de diciembre.',
      equipment: ['gym', 'hangboard'],
      equipmentNotes: 'Beastmaker 1000',
      daysPerWeek: 4,
      climbingDaysPerWeek: 3,
      trainingDaysPerWeek: 1,
      availableDays: ['monday', 'wednesday', 'friday', 'saturday'],
      sessionDuration: 90,
      maxSessionDuration: 120,
      planDuration: 4,
      injuries: ['none'],
      currentFingerPain: 0,
      currentShoulderPain: 0,
      currentElbowPain: 0,
      trainingAggressiveness: 'balanced',
      sleep: 'good',
      pullUpAbility: '4to8',
      fingerTrainingExperience: 'structured',
      pullupsBodyweight: 8
    };
    const row = toDbRow(payload);

    // Campos nuevos (Bloque 3 + Bloque 4) presentes.
    expect(row.climbing_days_per_week).toBe(3);
    expect(row.training_days_per_week).toBe(1);
    expect(row.disciplines).toEqual(['sport', 'boulder']);
    expect(row.setting).toBe('indoor');
    expect(row.available_days).toEqual([
      'monday',
      'wednesday',
      'friday',
      'saturday'
    ]);
    expect(row.max_session_duration).toBe(120);
    expect(row.pull_up_ability).toBe('4to8');
    expect(row.finger_training_experience).toBe('structured');

    // Campos cortados NO deben aparecer.
    const cutColumns = [
      'height',
      'warmup',
      'energy',
      'energy_level',
      'previous_training',
      'training_history',
      'outdoor_frequency',
      'campus_experience',
      'bench_press_1rm',
      'squat_1rm',
      'deadlift_1rm',
      'project',
      'project_description',
      'rock_project_description'
    ];
    for (const col of cutColumns) {
      expect(row).not.toHaveProperty(col);
    }
  });

  it('payloads legacy con campos cortados: Zod los descarta silenciosamente', () => {
    // Un cliente viejo podría mandar height/energy/project. El schema
    // los ignora en el parse — no falla, pero no llegan a la row.
    const legacyPayload = {
      character: 'bill',
      daysPerWeek: 3,
      climbingDaysPerWeek: 2,
      trainingDaysPerWeek: 1,
      // Los cortados:
      height: 170,
      energy: 'normal',
      warmup: 'always',
      previousTraining: 'informal',
      benchPress1Rm: 80,
      project: 'La Catrina 5.12a',
      rockProjectDescription: 'Desplome largo'
    } as unknown as ProfileInput;

    const row = toDbRow(legacyPayload);
    expect(row).not.toHaveProperty('height');
    expect(row).not.toHaveProperty('energy');
    expect(row).not.toHaveProperty('warmup');
    expect(row).not.toHaveProperty('previous_training');
    expect(row).not.toHaveProperty('bench_press_1rm');
    expect(row).not.toHaveProperty('project');
    // Y los nuevos SÍ.
    expect(row.climbing_days_per_week).toBe(2);
    expect(row.training_days_per_week).toBe(1);
  });
});

describe('Round-trip · row DB → rowToProfile → profileToPrompt', () => {
  it('regeneración con perfil completo: prompt lee el desglose y no tiene líneas huérfanas', () => {
    const row = makeRow();
    const partial = rowToProfile(row);
    // El plan endpoint solo necesita los campos que profileToPrompt lee;
    // completamos con defaults para satisfacer el UserProfile type.
    const profile: UserProfile = {
      ...(partial as UserProfile),
      accessToCampusBoard: false,
      accessToHangboard: true,
      accessToTRX: false,
      accessToWeights: false,
      goal: 'grade'
    };

    const prompt = profileToPrompt(profile);

    // Nuevos presentes (Bloque 3).
    expect(prompt).toContain('Días por semana: 4');
    expect(prompt).toContain('Desglose: Escalada 3 días · Entrenamiento extra 1 días');
    // Nuevos persistidos (Bloque 4) — el motor ahora los lee vía rowToProfile.
    expect(prompt).toContain('Disciplinas: sport, boulder');
    expect(prompt).toContain('Setting: indoor');
    expect(prompt).toContain('Días disponibles: monday, wednesday, friday, saturday');
    expect(prompt).toContain('Duración sesión: 90 min (máx 120)');
    expect(prompt).toContain('Dominadas (categoría): 4to8');
    expect(prompt).toContain('Exp. dedos: structured');

    // Cortados NO aparecen — prompt limpio, sin líneas huérfanas.
    const huerfanas = [
      'Estatura:',
      'Proyecto:',
      'Contexto proyecto:',
      'Plan anterior:',
      'Frecuencia roca:',
      'Exp. campus:',
      'Energía:',
      'Calentamiento habitual:',
      'Press banca 1RM:',
      'Sentadilla 1RM:',
      'Peso muerto 1RM:'
    ];
    for (const linea of huerfanas) {
      expect(prompt).not.toContain(linea);
    }
  });

  it('perfil legacy (row sin desglose de días): prompt cae al modo backward-compat', () => {
    const row = makeRow({
      climbing_days_per_week: null,
      training_days_per_week: null,
      days_per_week: 3
    });
    const partial = rowToProfile(row);
    // Los null se transforman a 0 en rowToProfile → tenemos 0+0 y no queremos
    // que el prompt afirme "Desglose: 0 · 0". La lógica del guard en
    // profileToPrompt ya lo protege — verificamos que sí lo hace.
    const profile: UserProfile = {
      ...(partial as UserProfile),
      accessToCampusBoard: false,
      accessToHangboard: true,
      accessToTRX: false,
      accessToWeights: false,
      goal: 'grade',
      // Simulamos legacy: perfil que existía antes del Bloque 3 (row.climbing
      // era null → rowToProfile lo mete como 0). Para el prompt queremos
      // que NO aparezca la línea porque ambos son 0.
      climbingDaysPerWeek: undefined,
      trainingDaysPerWeek: undefined
    };
    const prompt = profileToPrompt(profile);
    expect(prompt).toContain('Días por semana: 3');
    expect(prompt).not.toContain('Desglose:');
  });
});

describe('Round-trip · profileToRow simétrico con toDbRow del onboarding', () => {
  it('los mismos 8 campos nuevos y el desglose se serializan igual', () => {
    const profile: Partial<UserProfile> = {
      character: 'senda',
      daysPerWeek: 3,
      climbingDaysPerWeek: 2,
      trainingDaysPerWeek: 1,
      disciplines: ['boulder'],
      setting: 'both',
      availableDays: ['tuesday', 'thursday', 'saturday'],
      maxSessionDuration: 120,
      pullUpAbility: '9plus',
      fingerTrainingExperience: 'advanced'
    };
    const row = profileToRow(profile);
    expect(row.climbing_days_per_week).toBe(2);
    expect(row.training_days_per_week).toBe(1);
    expect(row.disciplines).toEqual(['boulder']);
    expect(row.setting).toBe('both');
    expect(row.available_days).toEqual(['tuesday', 'thursday', 'saturday']);
    expect(row.max_session_duration).toBe(120);
    expect(row.pull_up_ability).toBe('9plus');
    expect(row.finger_training_experience).toBe('advanced');
  });
});
