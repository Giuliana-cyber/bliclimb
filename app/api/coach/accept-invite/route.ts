// POST /api/coach/accept-invite — el cliente confirma una invitación abierta.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { acceptInvite } from '@/lib/coach';

export const runtime = 'nodejs';

const BodySchema = z.object({ token: z.string().min(8) });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'auth_required', message: 'Iniciá sesión para aceptar la invitación.' },
      { status: 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    const result = await acceptInvite(user.id, parsed.data.token, admin);
    return NextResponse.json({ ok: true, relationId: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (/no encontrada/i.test(message)) {
      return NextResponse.json({ error: 'invite_not_found', message }, { status: 404 });
    }
    if (/otro usuario/i.test(message)) {
      return NextResponse.json({ error: 'invite_taken', message }, { status: 409 });
    }
    if (/no es válida/i.test(message)) {
      return NextResponse.json({ error: 'invite_revoked', message }, { status: 410 });
    }
    return NextResponse.json({ error: 'accept_failed', message }, { status: 500 });
  }
}
