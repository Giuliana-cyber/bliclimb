// POST /api/coach/invite — el coach genera un link de invitación para un email.
// Valida: auth + role=coach + cupo del tier.
//
// Comportamiento garantizado: este endpoint NO envía emails. Solo inserta
// una fila en `coach_clients` (status='pending') y devuelve la URL para
// que el coach la comparta manualmente por WhatsApp u otro canal externo.
// Si alguna vez se quiere agregar envío automático de email, hay que
// hacerlo explícitamente acá llamando a un proveedor (Resend/Postmark);
// nunca disparar `supabase.auth.admin.inviteUserByEmail` para esto porque
// activa el template de Supabase con branding ajeno.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canAddClient, inviteClient, isCoach } from '@/lib/coach';

export const runtime = 'nodejs';

const BodySchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const admin = createAdminClient();
  const coach = await isCoach(user.id, admin);
  if (!coach) {
    return NextResponse.json({ error: 'forbidden_not_coach' }, { status: 403 });
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

  const canAdd = await canAddClient(user.id, admin);
  if (!canAdd) {
    return NextResponse.json(
      {
        error: 'client_limit_reached',
        message: 'Llegaste al cupo de tu plan. Cambiá a Pro o Gym para invitar más clientes.'
      },
      { status: 402 }
    );
  }

  try {
    const result = await inviteClient(user.id, parsed.data.email, admin);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'invite_failed', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
