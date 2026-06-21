// POST /api/app-open — registra que el usuario abrió la app hoy. Sirve para
// mantener viva la racha aunque no haga sesión ni check-in.
//
// Idempotente por (profile_id, date). Si ya hay actividad mejor (session_completed
// o checkin) ese día, este endpoint no la sobreescribe — la PRIORIDAD ya está
// resuelta porque las otras llamadas ocurren antes y la UNIQUE constraint hace
// que esta llamada falle silenciosamente con `newRecord=false`.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordDailyActivity } from '@/lib/streaks';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    // No tira 401 ruidoso — esto se llama fire-and-forget desde el layout.
    // Devolver 204 para que el cliente no logguee error.
    return new NextResponse(null, { status: 204 });
  }

  try {
    const admin = createAdminClient();
    const result = await recordDailyActivity(user.id, 'app_open', null, admin);
    return NextResponse.json({
      ok: true,
      streak: {
        previous: result.previousStreak,
        current: result.newStreak,
        milestone: result.milestone
      }
    });
  } catch {
    // No queremos romper la carga de la app si el streak update falla.
    return new NextResponse(null, { status: 204 });
  }
}
