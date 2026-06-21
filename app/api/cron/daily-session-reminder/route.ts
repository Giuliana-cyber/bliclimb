// Cron diario: recordatorio de la sesión del día.
// Vercel lo invoca según `vercel.json` ("0 15 * * *" = 9am CDMX).
//
// Para cada usuario con plan activo + push subs activas + preferencia
// notification_preferences.dailyReminder=true:
//   - Si tiene sesión hoy (week_number == current_week, dayNumber == hoy mod days):
//     manda push.
//   - Si no (descanso), skip.
//
// "Día de hoy" en el plan: para simplicidad usamos dayOfWeek (lunes=1).
// Si tu plan necesita lógica más compleja la refinamos después.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/cron/auth';
import { sendPushToUser } from '@/lib/push/send';

export const runtime = 'nodejs';

type ActivePlan = {
  id: string;
  profile_id: string;
  current_week: number;
};

type Profile = {
  id: string;
  notification_preferences: { dailyReminder?: boolean } | null;
};

type SessionRow = {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  estimated_minutes: number | null;
  completed: boolean;
};

function todayDayNumber(now: Date = new Date()): number {
  // Día de la semana (lun=1, dom=7). Si tu plan usa 1..N por semana sin
  // mapeo a día de semana, ajustar este mapeo.
  const dow = now.getUTCDay(); // 0=dom..6=sab
  return dow === 0 ? 7 : dow;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const dayNumber = todayDayNumber();

  // 1. Planes activos.
  const { data: plansData } = await admin
    .from('plans')
    .select('id, profile_id, current_week')
    .eq('status', 'active');
  const plans = (plansData ?? []) as ActivePlan[];
  if (plans.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, sent: 0, skipped: 0 });
  }

  // 2. Profiles con prefs.
  const userIds = plans.map((p) => p.profile_id);
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, notification_preferences')
    .in('id', userIds);
  const profileById = new Map<string, Profile>();
  for (const p of (profilesData ?? []) as Profile[]) profileById.set(p.id, p);

  // 3. Sesiones de hoy para cada plan.
  const planIds = plans.map((p) => p.id);
  const { data: sessionsData } = await admin
    .from('sessions')
    .select('id, plan_id, day_number, title, estimated_minutes, completed, week_number')
    .in('plan_id', planIds)
    .eq('day_number', dayNumber);
  const sessions = (sessionsData ?? []) as Array<SessionRow & { week_number: number }>;

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const plan of plans) {
    const profile = profileById.get(plan.profile_id);
    const optedIn = profile?.notification_preferences?.dailyReminder !== false;
    if (!optedIn) {
      skipped += 1;
      continue;
    }
    const session = sessions.find(
      (s) => s.plan_id === plan.id && s.week_number === plan.current_week
    );
    if (!session) {
      skipped += 1;
      continue;
    }
    if (session.completed) {
      skipped += 1;
      continue;
    }
    try {
      const result = await sendPushToUser(
        plan.profile_id,
        {
          title: 'Hoy toca entrenar',
          body: `${session.title} · ${session.estimated_minutes ?? 60} min`,
          url: `/session?week=${plan.current_week}&day=${session.day_number}`,
          tag: `daily-${plan.id}-${plan.current_week}-${session.day_number}`
        },
        admin
      );
      if (result.sent > 0) sent += 1;
    } catch (err) {
      errors.push({
        userId: plan.profile_id,
        message: err instanceof Error ? err.message : 'unknown'
      });
    }
  }

  console.log(
    JSON.stringify({
      kind: 'cron_daily_session_reminder',
      scanned: plans.length,
      sent,
      skipped,
      errors: errors.length
    })
  );

  return NextResponse.json({ ok: true, scanned: plans.length, sent, skipped, errors });
}
