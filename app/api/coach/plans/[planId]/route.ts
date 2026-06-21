// PUT  /api/coach/plans/[planId] — guarda el borrador (plan_data + meta)
// POST /api/coach/plans/[planId]?action=publish|archive — cambia status
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCoach } from '@/lib/coach';
import { CoachPlanDataSchema } from '@/lib/coach/plan-data';
import { materializeCoachPlan } from '@/lib/coach/publish';
import { sendPushToUser } from '@/lib/push/send';

export const runtime = 'nodejs';

const UpdateSchema = z.object({
  title: z.string().min(1).max(120),
  objective: z.string().max(2000).nullable().optional(),
  durationWeeks: z.number().int().min(1).max(12),
  planData: CoachPlanDataSchema
});

async function loadOwnedPlan(adminClient: SupabaseClient, coachId: string, planId: string) {
  const { data } = await adminClient
    .from('coach_plans')
    .select('id, coach_id, client_id, status, title, duration_weeks, plan_data, published_plan_id')
    .eq('id', planId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  if (row.coach_id !== coachId) return null;
  return row;
}

export async function PUT(request: Request, { params }: { params: { planId: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const admin = createAdminClient() as unknown as SupabaseClient;
  if (!(await isCoach(user.id, admin))) {
    return NextResponse.json({ error: 'forbidden_not_coach' }, { status: 403 });
  }
  const existing = await loadOwnedPlan(admin, user.id, params.planId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from('coach_plans')
    .update({
      title: parsed.data.title,
      objective: parsed.data.objective ?? null,
      duration_weeks: parsed.data.durationWeeks,
      plan_data: parsed.data.planData
    })
    .eq('id', params.planId);
  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: { planId: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const admin = createAdminClient() as unknown as SupabaseClient;
  if (!(await isCoach(user.id, admin))) {
    return NextResponse.json({ error: 'forbidden_not_coach' }, { status: 403 });
  }
  const existing = await loadOwnedPlan(admin, user.id, params.planId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'archive') {
    await admin
      .from('coach_plans')
      .update({ status: 'archived' })
      .eq('id', params.planId);
    return NextResponse.json({ ok: true, status: 'archived' });
  }

  if (action === 'publish') {
    const planData = CoachPlanDataSchema.safeParse(existing.plan_data);
    if (!planData.success) {
      return NextResponse.json(
        { error: 'invalid_plan_data', issues: planData.error.issues },
        { status: 400 }
      );
    }
    const clientId = existing.client_id as string;
    const title = (existing.title as string) ?? 'Plan del coach';
    try {
      const publishedPlanId = await materializeCoachPlan(admin, {
        coachId: user.id,
        clientId,
        planData: planData.data,
        title
      });
      await admin
        .from('coach_plans')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          published_plan_id: publishedPlanId
        })
        .eq('id', params.planId);

      // Push al cliente: "tu coach publicó un nuevo plan". Fire-and-forget;
      // si falla no rompemos la publicación. Respeta notification_preferences
      // .coachUpdates (default true vía el default jsonb de la migración).
      try {
        const { data: clientProfile } = await admin
          .from('profiles')
          .select('notification_preferences')
          .eq('id', clientId)
          .maybeSingle();
        const optedIn =
          (clientProfile as { notification_preferences?: { coachUpdates?: boolean } } | null)
            ?.notification_preferences?.coachUpdates !== false;
        if (optedIn) {
          await sendPushToUser(
            clientId,
            {
              title: 'Tu coach publicó un nuevo plan',
              body: `${title}. Tap para verlo.`,
              url: '/plan',
              tag: `coach-plan-${publishedPlanId}`
            },
            admin
          );
        }
      } catch {
        // ignore — la publicación ya quedó hecha
      }

      return NextResponse.json({ ok: true, status: 'published', publishedPlanId });
    } catch (error) {
      return NextResponse.json(
        { error: 'publish_failed', detail: error instanceof Error ? error.message : 'unknown' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
