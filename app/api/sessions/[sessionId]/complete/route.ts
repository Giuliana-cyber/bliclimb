// POST /api/sessions/[sessionId]/complete — marca una sesión como completada
// en `public.sessions` y dispara el registro de actividad del día para la
// racha.
//
// Requiere auth. La sesión debe pertenecer a un plan del usuario actual
// (validado vía join con `plans.profile_id`).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordDailyActivity } from '@/lib/streaks';

export const runtime = 'nodejs';

const ParamsSchema = z.object({
  sessionId: z.string().uuid()
});

export async function POST(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  }
  const { sessionId } = parsed.data;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verificar que la sesión pertenece a un plan del usuario.
  const { data: sessionRow, error: lookupErr } = await admin
    .from('sessions')
    .select('id, plan_id, completed')
    .eq('id', sessionId)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json(
      { error: 'lookup_failed', detail: lookupErr.message },
      { status: 500 }
    );
  }
  if (!sessionRow) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }
  const { data: planRow } = await admin
    .from('plans')
    .select('profile_id')
    .eq('id', (sessionRow as { plan_id: string }).plan_id)
    .maybeSingle();
  if (!planRow || (planRow as { profile_id: string }).profile_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Marcar la sesión. Idempotente — si ya estaba completed, no toca
  // completed_at para preservar el timestamp original.
  if (!(sessionRow as { completed: boolean }).completed) {
    const updatePayload = {
      completed: true,
      completed_at: new Date().toISOString()
    };
    const { error: updErr } = await (admin as unknown as {
      from: (t: string) => {
        update: (payload: unknown) => {
          eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    })
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId);
    if (updErr) {
      return NextResponse.json(
        { error: 'update_failed', detail: updErr.message },
        { status: 500 }
      );
    }
  }

  // Registrar actividad del día (dispara recálculo de racha + milestone).
  const streakResult = await recordDailyActivity(
    user.id,
    'session_completed',
    sessionId,
    admin
  );

  return NextResponse.json({
    ok: true,
    sessionId,
    streak: {
      previous: streakResult.previousStreak,
      current: streakResult.newStreak,
      milestone: streakResult.milestone
    }
  });
}
