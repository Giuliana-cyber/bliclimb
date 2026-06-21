// GET  /api/notification-preferences — lee profiles.notification_preferences.
// PUT  /api/notification-preferences — actualiza el shape completo.
//
// Shape: { dailyReminder, weeklySummary, coachUpdates }. Default jsonb
// (definido en migración 0008) tiene los 3 en true.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const PrefsSchema = z.object({
  dailyReminder: z.boolean(),
  weeklySummary: z.boolean(),
  coachUpdates: z.boolean()
});

export type NotificationPrefs = z.infer<typeof PrefsSchema>;

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminder: true,
  weeklySummary: true,
  coachUpdates: true
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle();
  const raw = (data as { notification_preferences?: unknown } | null)?.notification_preferences;
  const parsed = PrefsSchema.safeParse(raw);
  return NextResponse.json({
    preferences: parsed.success ? parsed.data : DEFAULT_PREFS
  });
}

export async function PUT(request: Request) {
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
  const parsed = PrefsSchema.safeParse(raw);
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

  const admin = createAdminClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('profiles')
    .update({ notification_preferences: parsed.data })
    .eq('id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, preferences: parsed.data });
}
