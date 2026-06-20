// POST /api/coach/plans — crea un borrador de plan (status='draft').
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCoach } from '@/lib/coach';
import { emptyPlanData } from '@/lib/coach/plan-data';

export const runtime = 'nodejs';

const BodySchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1).max(120),
  objective: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(12).default(4)
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const admin = createAdminClient();
  if (!(await isCoach(user.id, admin))) {
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
      { error: 'invalid_payload', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { clientId, title, objective, durationWeeks } = parsed.data;

  // Verificar relación coach↔cliente
  const { data: rel } = await admin
    .from('coach_clients')
    .select('id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (!rel) {
    return NextResponse.json({ error: 'client_not_yours' }, { status: 403 });
  }

  const adminUntyped = admin as unknown as SupabaseClient;
  const { data: created, error } = await adminUntyped
    .from('coach_plans')
    .insert({
      coach_id: user.id,
      client_id: clientId,
      title,
      objective: objective ?? null,
      duration_weeks: durationWeeks,
      plan_data: emptyPlanData(durationWeeks),
      status: 'draft'
    })
    .select('id')
    .single();
  if (error || !created) {
    return NextResponse.json({ error: 'create_failed', detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ id: (created as { id: string }).id });
}
