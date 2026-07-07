// Schema del body de POST /api/profile + mapping camelCase → snake_case
// para public.profiles.
//
// Vive aparte de `route.ts` porque Next.js App Router prohíbe exports
// arbitrarios desde archivos de ruta (solo GET/POST/handlers HTTP y
// runtime/dynamic/etc). Al mover el schema + toDbRow a un módulo aparte,
// los podemos exportar libremente y consumir tanto desde `route.ts` como
// desde los tests unitarios (round-trip.test.ts).
//
// Bloque 4 audit-360: schema recortado (14 campos out) + agregados
// climbingDaysPerWeek/trainingDaysPerWeek + los que ya se capturaban
// pero no persistían (disciplines, setting, availableDays,
// maxSessionDuration, pullUpAbility, fingerTrainingExperience).

import { z } from 'zod';

export const ProfileSchema = z.object({
  character: z.enum(['bill', 'senda']).optional(),
  language: z.enum(['es', 'en']).optional(),
  name: z.string().optional(),
  age: z.string().optional(),
  sex: z.string().optional(),
  weight: z.number().nullable().optional(),
  climbingTime: z.string().optional(),
  disciplines: z.array(z.string()).optional(),
  level: z.string().optional(),
  setting: z.string().optional(),
  goals: z.array(z.string()).optional(),
  goalDescription: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  equipmentNotes: z.string().optional(),
  daysPerWeek: z.number().int().optional(),
  climbingDaysPerWeek: z.number().int().min(0).max(7).optional(),
  trainingDaysPerWeek: z.number().int().min(0).max(7).optional(),
  availableDays: z.array(z.string()).optional(),
  sessionDuration: z.number().int().optional(),
  maxSessionDuration: z.number().int().optional(),
  planDuration: z.number().int().optional(),
  injuries: z.array(z.string()).optional(),
  injuryDescription: z.string().optional(),
  injuryNotes: z.string().optional(),
  currentFingerPain: z.number().int().optional(),
  currentShoulderPain: z.number().int().optional(),
  currentElbowPain: z.number().int().optional(),
  wantsConservativePlan: z.boolean().optional(),
  trainingAggressiveness: z.string().optional(),
  sleepQuality: z.string().optional(),
  sleep: z.string().optional(),
  pullUpAbility: z.string().optional(),
  fingerTrainingExperience: z.string().optional(),
  pullupsBodyweight: z.number().int().nullable().optional(),
  pullupsAddedWeight5Reps: z.number().int().nullable().optional(),
  hangboard20mmSeconds: z.number().int().nullable().optional(),
  hangboard20mmAddedWeight7s: z.number().int().nullable().optional()
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

// Map camelCase → snake_case. Solo incluimos campos con valor definido;
// undefined → omitido. null sí se respeta (limpiar un valor previo).
export function toDbRow(p: ProfileInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = <K extends keyof ProfileInput>(col: string, key: K) => {
    if (p[key] !== undefined) row[col] = p[key];
  };
  set('character', 'character');
  set('language', 'language');
  set('name', 'name');
  set('age', 'age');
  set('sex', 'sex');
  set('weight', 'weight');
  set('climbing_time', 'climbingTime');
  set('disciplines', 'disciplines');
  set('level', 'level');
  set('setting', 'setting');
  set('goals', 'goals');
  set('goal_description', 'goalDescription');
  set('equipment', 'equipment');
  set('equipment_notes', 'equipmentNotes');
  set('days_per_week', 'daysPerWeek');
  set('climbing_days_per_week', 'climbingDaysPerWeek');
  set('training_days_per_week', 'trainingDaysPerWeek');
  set('available_days', 'availableDays');
  set('session_duration', 'sessionDuration');
  set('max_session_duration', 'maxSessionDuration');
  set('plan_duration', 'planDuration');
  set('injuries', 'injuries');
  set('injury_description', 'injuryDescription');
  set('injury_notes', 'injuryNotes');
  set('current_finger_pain', 'currentFingerPain');
  set('current_shoulder_pain', 'currentShoulderPain');
  set('current_elbow_pain', 'currentElbowPain');
  set('wants_conservative_plan', 'wantsConservativePlan');
  set('training_aggressiveness', 'trainingAggressiveness');
  set('sleep_quality', 'sleepQuality');
  set('sleep', 'sleep');
  set('pull_up_ability', 'pullUpAbility');
  set('finger_training_experience', 'fingerTrainingExperience');
  set('pullups_bodyweight', 'pullupsBodyweight');
  set('pullups_added_weight_5reps', 'pullupsAddedWeight5Reps');
  set('hangboard_20mm_seconds', 'hangboard20mmSeconds');
  set('hangboard_20mm_added_weight_7s', 'hangboard20mmAddedWeight7s');
  return row;
}
