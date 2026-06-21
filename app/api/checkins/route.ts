// POST /api/checkins — guarda un check-in del usuario en `public.check_ins` y
// dispara el registro de actividad del día (tipo 'checkin').
//
// El cliente ya manda los campos del check-in tal como los maneja la UI;
// acá los mapeamos al schema de la tabla.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertCheckIn } from '@/lib/db/check-ins';
import { recordDailyActivity } from '@/lib/streaks';

export const runtime = 'nodejs';

const ManualActivitySchema = z
  .object({
    title: z.string().default(''),
    location: z.string().default(''),
    durationMinutes: z.number().nullable().default(null),
    details: z.string().default(''),
    customizedPlan: z.boolean().default(false)
  })
  .nullable()
  .optional();

const BodySchema = z.object({
  id: z.string().optional(),
  sessionId: z.string().optional().default(''),
  planId: z.string().optional().default(''),
  date: z.string().optional(),
  completed: z.enum(['full', 'partial', 'skipped']).optional().default('full'),
  rpe: z.number().int().min(0).max(10).optional().default(0),
  fingerPain: z.number().int().min(0).max(10).optional().default(0),
  otherPain: z.array(z.string()).optional().default([]),
  energy: z.number().int().min(0).max(5).optional().default(3),
  sleep: z.number().int().min(0).max(5).optional().default(3),
  notes: z.string().optional().default(''),
  manualActivity: ManualActivitySchema
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
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
  const checkIn = parsed.data;

  const admin = createAdminClient();

  try {
    const saved = await insertCheckIn(admin, user.id, {
      id: checkIn.id ?? crypto.randomUUID(),
      sessionId: checkIn.sessionId,
      planId: checkIn.planId,
      date: checkIn.date ?? new Date().toISOString(),
      completed: checkIn.completed,
      rpe: checkIn.rpe,
      fingerPain: checkIn.fingerPain,
      otherPain: checkIn.otherPain,
      energy: checkIn.energy,
      sleep: checkIn.sleep,
      notes: checkIn.notes,
      manualActivity: checkIn.manualActivity ?? null
    });

    // Actividad del día → racha. Idempotente por (user, date).
    const streakResult = await recordDailyActivity(user.id, 'checkin', null, admin);

    return NextResponse.json({
      ok: true,
      checkIn: saved,
      streak: {
        previous: streakResult.previousStreak,
        current: streakResult.newStreak,
        milestone: streakResult.milestone
      }
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return NextResponse.json({ error: 'save_failed', detail }, { status: 500 });
  }
}
