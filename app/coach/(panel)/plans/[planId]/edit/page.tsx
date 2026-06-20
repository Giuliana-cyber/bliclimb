import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCoachContext } from '@/lib/coach/context';
import { CoachPlanDataSchema, emptyPlanData } from '@/lib/coach/plan-data';
import { PlanEditor } from '@/components/coach/PlanEditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EditCoachPlanPage({
  params
}: {
  params: { planId: string };
}) {
  const context = await loadCoachContext();
  if (!context) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('coach_plans')
    .select('id, coach_id, title, objective, duration_weeks, plan_data, status')
    .eq('id', params.planId)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Record<string, unknown>;
  if (row.coach_id !== context.userId) notFound();

  const durationWeeks = (row.duration_weeks as number) ?? 4;
  const planDataParse = CoachPlanDataSchema.safeParse(row.plan_data);
  const planData = planDataParse.success ? planDataParse.data : emptyPlanData(durationWeeks);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-white">Editar plan</h1>
      <PlanEditor
        planId={params.planId}
        initialTitle={(row.title as string) ?? ''}
        initialObjective={((row.objective as string | null) ?? '')}
        initialDurationWeeks={durationWeeks}
        initialPlanData={planData}
        status={(row.status as 'draft' | 'published' | 'archived') ?? 'draft'}
      />
    </div>
  );
}
