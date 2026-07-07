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
