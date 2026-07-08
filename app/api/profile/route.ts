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

  // TEMPORARY · Bug #1 diagnosis (2026-07-08) ==========================
  // Sacar cuando Bug #1 (PATCH 200 → filas en 0) esté cerrado. La
  // instrumentación anterior loggeaba solo `Object.keys(row)`, lo que no
  // permite distinguir: (1) cliente no mandó los valores, (2) PATCH
  // silenció el write, (3) RLS bloqueó sin errorear. Con estos tres logs
  // se puede triangular en Vercel:
  //   - attempt_update.rowSample muestra qué valores llegaron al server
  //   - update_ok_verify.verifiedFields muestra qué quedó en la DB tras el PATCH
  //   - update_failed.errorSerialized incluye code/details/hint de PostgREST
  //
  // Barrer todo el bloque TEMPORARY (definición de FIELDS_TO_VERIFY,
  // pickSample, select post-update, y el evento update_ok_verify)
  // restaurando el `attempt_update`/`update_ok` slim que estaba antes.
  const FIELDS_TO_VERIFY = [
    'injuries',
    'injury_notes',
    'disciplines',
    'setting',
    'available_days',
    'max_session_duration',
    'pull_up_ability',
    'finger_training_experience',
    'climbing_days_per_week',
    'training_days_per_week',
    'sleep'
  ] as const;
  const pickSample = (source: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const key of FIELDS_TO_VERIFY) {
      if (key in source) out[key] = source[key];
    }
    return out;
  };
  log({
    event: 'attempt_update',
    userId: user.id,
    fields: Object.keys(row),
    rowSample: pickSample(row)
  });
  // === END TEMPORARY block header ===

  const admin = createAdminClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{
          error:
            | {
                message: string;
                code?: string;
                details?: string;
                hint?: string;
              }
            | null;
        }>;
      };
    };
  })
    .from('profiles')
    .update(row)
    .eq('id', user.id);
  if (error) {
    // TEMPORARY · Bug #1 diagnosis: incluir code/details/hint además de
    // message. PostgREST silencia RLS con message vacío pero code/hint
    // pueden delatar el motivo real.
    log({
      event: 'update_failed',
      userId: user.id,
      message: error.message,
      errorSerialized: {
        message: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null
      }
    });
    return NextResponse.json(
      { error: 'save_failed', detail: error.message },
      { status: 500 }
    );
  }

  log({ event: 'update_ok', userId: user.id, fieldCount: Object.keys(row).length });

  // TEMPORARY · Bug #1 diagnosis: relectura post-PATCH. Si el UPDATE dijo
  // OK pero verifiedFields != rowSample, el bug está entre PostgREST y
  // Postgres (RLS silencioso, trigger que revierte, etc). Si vienen
  // iguales, el bug es upstream (cliente no mandó valores nuevos, o el
  // browser tiene un cache viejo).
  try {
    const { data: verifyRow, error: verifyError } = await (admin as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, value: string) => {
            maybeSingle: () => Promise<{
              data: Record<string, unknown> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from('profiles')
      .select(FIELDS_TO_VERIFY.join(','))
      .eq('id', user.id)
      .maybeSingle();
    if (verifyError) {
      log({
        event: 'update_ok_verify',
        userId: user.id,
        verifyFailed: true,
        verifyError: verifyError.message
      });
    } else {
      log({
        event: 'update_ok_verify',
        userId: user.id,
        verifiedFields: verifyRow ? pickSample(verifyRow) : null,
        rowNull: verifyRow === null
      });
    }
  } catch (verifyThrown) {
    log({
      event: 'update_ok_verify',
      userId: user.id,
      verifyThrown:
        verifyThrown instanceof Error ? verifyThrown.message : String(verifyThrown)
    });
  }
  // === END TEMPORARY block ===

  return NextResponse.json({ ok: true, fieldsUpdated: Object.keys(row).length });
}
