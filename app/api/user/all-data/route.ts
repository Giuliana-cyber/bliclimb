// POST /api/user/all-data → borra la cuenta completa del usuario autenticado.
//
// Contrato del bloque 2 (audit-360):
//   1. Requiere sesión Supabase válida. Sin sesión → 401 sin efectos.
//   2. `user.id` sale SIEMPRE de `supabase.auth.getUser()` — NUNCA del body.
//      Aunque el request incluya `{ userId: 'OTHER' }`, ese valor se ignora.
//   3. Ejecuta `admin.auth.admin.deleteUser(user.id)`. La FK
//      `profiles.id references auth.users(id) on delete cascade` propaga
//      el borrado a todas las tablas child: check_ins, plans, sessions,
//      daily_activity, entitlements, push_subscriptions, subscriptions,
//      weekly_summaries, coach_clients, coach_plans.
//   4. NO cancela la suscripción de Stripe — es acción aparte. El copy
//      del confirm en Ajustes se lo dice al usuario ANTES.
//
// Elegimos POST (no DELETE) para evitar bodies-in-DELETE que algunos
// hosts/CDNs cachean o rechazan; el path `/api/user/all-data` con method
// POST deja la intención clara.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function log(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ kind: 'user_delete', ts: new Date().toISOString(), ...payload })
  );
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    log({ event: 'no_user' });
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    // El schema garantiza cascade delete desde auth.users a public.profiles
    // y de ahí a todas las tablas child (ver migrations/0001_init.sql).
    // Una sola llamada limpia toda la superficie DB del usuario.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      log({ event: 'delete_failed', userId: user.id, message: error.message });
      return NextResponse.json(
        { error: 'delete_failed', detail: error.message },
        { status: 500 }
      );
    }
    log({ event: 'delete_ok', userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    log({ event: 'delete_threw', userId: user.id, detail });
    return NextResponse.json({ error: 'delete_failed', detail }, { status: 500 });
  }
}
