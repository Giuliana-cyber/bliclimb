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
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
// Bloque 4 audit-360 · fix build: ProfileSchema / ProfileInput / toDbRow
// viven en ./schema porque Next.js prohíbe exports arbitrarios desde
// archivos `route.ts`.
import { ProfileSchema, toDbRow } from './schema';

export const runtime = 'nodejs';

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
  // TEMPORARY diagnostic — remove after root cause found (audit-360 bug #1)
  // Loguea el row COMPLETO que va a Supabase — la lista `fields:` sola no
  // revela si un campo está undefined vs 0 vs null vs []; con el JSON
  // sabemos exactamente qué se manda.
  log({
    event: 'attempt_update',
    userId: user.id,
    fields: Object.keys(row),
    rowSample: JSON.stringify(row).slice(0, 4000),
    rawKeys: raw && typeof raw === 'object' ? Object.keys(raw as object) : []
  });
  // END TEMPORARY diagnostic

  const admin = createAdminClient();
  // TEMPORARY diagnostic — remove after root cause found (audit-360 bug #1)
  // Usamos el shape completo del response de Supabase (data + error) para
  // detectar el caso "OK sin persistir" que sospechamos. `data` con `.select()`
  // devuelve la row después del update — si columnas nuevas siguen en default
  // pese al UPDATE, es evidencia dura del SDK/PostgREST silent-drop.
  const updateResult = await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, value: string) => {
          select: () => Promise<{
            data: unknown;
            error: { message: string; code?: string; details?: string; hint?: string } | null;
          }>;
        };
      };
    };
  })
    .from('profiles')
    .update(row)
    .eq('id', user.id)
    .select();
  const { data: updatedData, error } = updateResult;
  // END TEMPORARY diagnostic
  if (error) {
    // TEMPORARY diagnostic — remove after root cause found (audit-360 bug #1)
    // Serializamos el error completo. PostgREST devuelve .code/.details/.hint
    // que el logger de solo `.message` estaba tirando a la basura.
    log({
      event: 'update_failed',
      userId: user.id,
      message: error.message,
      errorSerialized: JSON.stringify(error)
    });
    // END TEMPORARY diagnostic
    return NextResponse.json(
      { error: 'save_failed', detail: error.message },
      { status: 500 }
    );
  }

  log({ event: 'update_ok', userId: user.id, fieldCount: Object.keys(row).length });
  // TEMPORARY diagnostic — remove after root cause found (audit-360 bug #1)
  // Verificación explícita: leemos los 8 campos "nuevos" del Bloque 4 tal
  // como quedaron en la row DESPUÉS del UPDATE. Si el SDK/PostgREST está
  // haciendo silent-drop, este log muestra defaults en vez de los valores
  // enviados y clava la causa raíz.
  const persistedRow = Array.isArray(updatedData) ? updatedData[0] : updatedData;
  log({
    event: 'update_ok_verify',
    userId: user.id,
    persistedNewFields: persistedRow
      ? {
          climbing_days_per_week: (persistedRow as Record<string, unknown>).climbing_days_per_week,
          training_days_per_week: (persistedRow as Record<string, unknown>).training_days_per_week,
          disciplines: (persistedRow as Record<string, unknown>).disciplines,
          setting: (persistedRow as Record<string, unknown>).setting,
          available_days: (persistedRow as Record<string, unknown>).available_days,
          max_session_duration: (persistedRow as Record<string, unknown>).max_session_duration,
          pull_up_ability: (persistedRow as Record<string, unknown>).pull_up_ability,
          finger_training_experience: (persistedRow as Record<string, unknown>).finger_training_experience
        }
      : null
  });
  // END TEMPORARY diagnostic
  return NextResponse.json({ ok: true, fieldsUpdated: Object.keys(row).length });
}
