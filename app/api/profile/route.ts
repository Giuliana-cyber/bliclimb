// POST /api/profile — guarda el perfil completo del usuario en
// public.profiles. Antes del bug fix, el onboarding solo escribía a
// localStorage; ahora también persiste a Supabase para que el server
// (gates, RAG, mensajes personalizados, coach panel) tenga acceso al
// shape completo del usuario.
//
// El endpoint UPDATEA (no inserta): la fila ya existe por el trigger
// handle_new_user que dispara al hacer signup. Solo escribimos los
// campos que el perfil trae con valor; los undefined se omiten para
// no pisar columnas con NULL accidentalmente.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Shape que aceptamos del cliente. Todos opcionales: si el onboarding
// se completa parcialmente, guardamos lo que haya.
// Bloque 4 audit-360: schema recortado (14 campos out) + agregados
// climbingDaysPerWeek/trainingDaysPerWeek + los que ya se capturaban
// pero no persistían (disciplines, setting, availableDays,
// maxSessionDuration, pullUpAbility, fingerTrainingExperience).
const ProfileSchema = z.object({
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
export { ProfileSchema };

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

function log(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ kind: 'profile_save', ts: new Date().toISOString(), ...payload })
  );
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    log({ event: 'no_user' });
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    log({ event: 'invalid_json', userId: user.id });
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    log({
      event: 'invalid_payload',
      userId: user.id,
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    });
    return NextResponse.json(
      {
        error: 'invalid_payload',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      },
      { status: 400 }
    );
  }

  const row = toDbRow(parsed.data);
  log({ event: 'attempt_update', userId: user.id, fields: Object.keys(row) });

  const admin = createAdminClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('profiles')
    .update(row)
    .eq('id', user.id);
  if (error) {
    log({ event: 'update_failed', userId: user.id, message: error.message });
    return NextResponse.json(
      { error: 'save_failed', detail: error.message },
      { status: 500 }
    );
  }

  log({ event: 'update_ok', userId: user.id, fieldCount: Object.keys(row).length });
  return NextResponse.json({ ok: true, fieldsUpdated: Object.keys(row).length });
}
