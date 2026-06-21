// Cron lunes 8am CDMX: genera el resumen de la semana anterior y manda
// push al usuario.
//
// Para cada plan activo:
//   - Construye weekly_summary para `current_week - 1` (semana que acaba
//     de terminar). Si current_week=1 → resumen de la 1.
//   - Guarda en weekly_summaries (idempotente).
//   - Si tiene push subs + notif.weeklySummary !== false → manda push.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/cron/auth';
import { buildWeeklySummary, persistWeeklySummary } from '@/lib/weekly/build';
import { sendPushToUser } from '@/lib/push/send';
import type { CharacterKey } from '@/lib/celebrations/messages';

export const runtime = 'nodejs';

type ActivePlan = {
  id: string;
  profile_id: string;
  current_week: number;
};

type Profile = {
  id: string;
  character: string | null;
  notification_preferences: { weeklySummary?: boolean } | null;
};

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();

  const { data: plansData } = await admin
    .from('plans')
    .select('id, profile_id, current_week')
    .eq('status', 'active');
  const plans = (plansData ?? []) as ActivePlan[];
  if (plans.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, sent: 0, generated: 0 });
  }

  const userIds = plans.map((p) => p.profile_id);
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, character, notification_preferences')
    .in('id', userIds);
  const profileById = new Map<string, Profile>();
  for (const p of (profilesData ?? []) as Profile[]) profileById.set(p.id, p);

  let generated = 0;
  let sent = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const plan of plans) {
    const profile = profileById.get(plan.profile_id);
    const character: CharacterKey =
      profile?.character === 'senda' ? 'senda' : 'bill';
    const weekTarget = Math.max(1, plan.current_week - 1);

    try {
      const summary = await buildWeeklySummary(
        plan.profile_id,
        character,
        admin,
        weekTarget
      );
      if (!summary) continue;
      await persistWeeklySummary(plan.profile_id, summary, admin);
      generated += 1;

      const optedIn = profile?.notification_preferences?.weeklySummary !== false;
      if (!optedIn) continue;
      const result = await sendPushToUser(
        plan.profile_id,
        {
          title: 'Tu resumen semanal te espera',
          body: `${summary.sessionsCompleted}/${summary.sessionsTotal} sesiones · semana ${summary.weekNumber}`,
          url: `/resumen-semanal?week=${summary.weekNumber}`,
          tag: `weekly-${plan.profile_id}-${summary.weekNumber}`
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
      kind: 'cron_weekly_summary',
      scanned: plans.length,
      generated,
      sent,
      errors: errors.length
    })
  );

  return NextResponse.json({
    ok: true,
    scanned: plans.length,
    generated,
    sent,
    errors
  });
}
