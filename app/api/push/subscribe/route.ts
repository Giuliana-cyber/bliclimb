// POST /api/push/subscribe — guarda (o actualiza) la subscripción de
// Web Push del navegador actual del usuario. Upsert por (profile_id,
// endpoint).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
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
  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get('user-agent') ?? null;

  const admin = createAdminClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      upsert: (
        v: Record<string, unknown>,
        opts: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>;
    };
  })
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: user.id,
        endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString()
      },
      { onConflict: 'profile_id,endpoint' }
    );
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
