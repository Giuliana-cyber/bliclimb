/**
 * POST /api/onboarding · P0 backend.
 *
 * Recibe el OnboardingState del client (validado con Zod), lo UPSERTA
 * en la tabla profiles y marca onboarded_at=now(). Requiere sesión
 * Supabase autenticada.
 *
 * Guardrails server-side:
 *   - Auth obligatoria (RLS ya bloquea, pero fail-fast antes de touch DB).
 *   - edad !== 'menor-16' (nunca guardamos menores de 16 en v1).
 *   - Zod valida shape antes de escribir.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { upsertOnboardingProfile } from '@/lib/db/onboarding-v2';

export const runtime = 'nodejs';

const OnboardingStateSchema = z.object({
  coach: z.enum(['bill', 'senda']).nullable(),
  disciplina: z.enum(['boulder', 'ruta', 'no-se']),
  grado: z.string().nullable(),
  estadoActual: z
    .enum(['activo', 'volviendo-paron', 'volviendo-lesion', 'empezando'])
    .nullable(),
  techoHistorico: z.string(),
  hangSeconds: z.number().nullable(),
  pullups: z.number().nullable(),
  hasInjury: z.boolean(),
  injuryZone: z.string(),
  estilos: z.array(
    z.enum(['regletas', 'romas', 'desplome', 'placa', 'chorreras', 'fisuras']),
  ),
  objetivo: z.string(),
  sesionesSemana: z.number().int().min(1).max(7),
  equipos: z.array(
    z.enum(['pesas', 'bandas', 'barra-dominadas', 'campus', 'hangboard', 'trx']),
  ),
  masEquipoPronto: z.boolean(),
  edad: z.enum(['menor-16', '16-35', '36-50', 'mas-50']).nullable(),
  hasActiveLesion: z.boolean(),
  zonasLesion: z.array(z.enum(['dedos', 'codos', 'hombros', 'espalda'])),
  dolorHoy: z.enum(['nada', 'molestia', 'dolor']).nullable(),
  embarazo: z.enum(['no-aplica', 'si']),
  energia: z.enum(['a-tope', 'normal', 'cansancio']).nullable(),
});

export async function POST(request: Request) {
  const supabase = createClient();

  // 1. Auth check · fail-fast antes de tocar DB
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json(
      { error: 'unauthenticated' },
      { status: 401 },
    );
  }

  // 2. Body parse + Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = OnboardingStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_shape', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const state = parsed.data;

  // 3. Guardrail v1 · menores de 16 bloqueados
  if (state.edad === 'menor-16') {
    return NextResponse.json(
      {
        error: 'age_blocked',
        message:
          'BilClimb v1 está pensado para 16 años en adelante. Cuando cumplas 16 podemos armar tu plan.',
      },
      { status: 403 },
    );
  }

  // 4. Campos requeridos mínimos (además del Zod, semántica)
  if (!state.coach) {
    return NextResponse.json(
      { error: 'coach_required' },
      { status: 400 },
    );
  }
  if (!state.grado || !state.estadoActual || !state.edad) {
    return NextResponse.json(
      { error: 'core_fields_required' },
      { status: 400 },
    );
  }

  // 5. UPSERT
  const result = await upsertOnboardingProfile(supabase, user.id, state);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'db_write_failed', message: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, redirect: '/hoy' });
}
