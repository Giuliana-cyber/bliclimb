// GET /api/weekly-summary[?week=N]
// Devuelve el resumen semanal del usuario. Si ya hay row en
// `weekly_summaries` lo lee de ahí; si no, lo construye on-the-fly y lo
// persiste para futuras lecturas / análisis.
//
// El cron del bloque 6 (lunes 8am) precalcula la semana anterior.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildWeeklySummary, persistWeeklySummary, type WeeklySummary } from '@/lib/weekly/build';
import type { CharacterKey } from '@/lib/celebrations/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const url = new URL(request.url);
  const weekParam = url.searchParams.get('week');
  const weekNumber = weekParam ? Number(weekParam) : null;
  if (weekParam && !Number.isFinite(weekNumber)) {
    return NextResponse.json({ error: 'invalid_week' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Personaje del usuario.
  const { data: profileRow } = await admin
    .from('profiles')
    .select('character')
    .eq('id', user.id)
    .maybeSingle();
  const character: CharacterKey =
    (profileRow as { character?: string } | null)?.character === 'senda' ? 'senda' : 'bill';

  // 2. Si la semana fue solicitada explícitamente, intentamos leer la fila
  //    persistida primero.
  if (weekNumber !== null) {
    const { data: cached } = await admin
      .from('weekly_summaries')
      .select('data, viewed_at')
      .eq('profile_id', user.id)
      .eq('week_number', weekNumber)
      .maybeSingle();
    if (cached && (cached as { data: WeeklySummary }).data) {
      return NextResponse.json({
        summary: (cached as { data: WeeklySummary }).data,
        viewedAt: (cached as { viewed_at: string | null }).viewed_at ?? null,
        cached: true
      });
    }
  }

  // 3. Construir on-the-fly.
  let summary: WeeklySummary | null;
  try {
    summary = await buildWeeklySummary(
      user.id,
      character,
      admin,
      weekNumber ?? undefined
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'build_failed', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
  if (!summary) {
    return NextResponse.json({ error: 'no_active_plan' }, { status: 404 });
  }

  // 4. Persistir (idempotente) para que el cron / siguientes lecturas
  //    encuentren la fila.
  try {
    await persistWeeklySummary(user.id, summary, admin);
  } catch {
    // No bloquea — si la persistencia falla, devolvemos igual la data.
  }

  return NextResponse.json({ summary, viewedAt: null, cached: false });
}

/**
 * POST /api/weekly-summary marca el row como visto (viewed_at = now()).
 * Espera body { weekNumber }.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }
  let body: { weekNumber?: number };
  try {
    body = (await request.json()) as { weekNumber?: number };
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const weekNumber = Number(body.weekNumber);
  if (!Number.isFinite(weekNumber)) {
    return NextResponse.json({ error: 'invalid_week' }, { status: 400 });
  }

  const admin = createAdminClient();
  await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, value: unknown) => {
          eq: (col: string, value: unknown) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  })
    .from('weekly_summaries')
    .update({ viewed_at: new Date().toISOString() })
    .eq('profile_id', user.id)
    .eq('week_number', weekNumber);

  return NextResponse.json({ ok: true });
}
