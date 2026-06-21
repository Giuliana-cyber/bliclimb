import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildWeeklySummary } from '@/lib/weekly/build';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { Card } from '@/components/ui/Card';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { ViewedAtPinger } from '@/components/weekly/ViewedAtPinger';
import type { CharacterKey } from '@/lib/celebrations/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ResumenSemanalPage({
  searchParams
}: {
  searchParams?: { week?: string };
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?next=/resumen-semanal');
  }

  const admin = createAdminClient();
  const { data: profileRow } = await admin
    .from('profiles')
    .select('character')
    .eq('id', user.id)
    .maybeSingle();
  const character: CharacterKey =
    (profileRow as { character?: string } | null)?.character === 'senda' ? 'senda' : 'bill';

  const weekParam = searchParams?.week ? Number(searchParams.week) : undefined;
  const summary = await buildWeeklySummary(user.id, character, admin, weekParam);

  if (!summary) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-2xl font-extrabold text-white">Aún no hay resumen</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Generá tu plan y completá tu primera sesión para empezar a ver resúmenes semanales.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-cyan px-5 py-3 text-sm font-bold text-brand-dark"
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  // ¿Estamos al cierre (todo completo) o todavía dentro de la semana?
  const closed = summary.sessionsTotal > 0 && summary.sessionsCompleted >= summary.sessionsTotal;
  const heading = closed
    ? `Semana ${summary.weekNumber} completada`
    : `Semana ${summary.weekNumber} en marcha`;
  const ctaLabel = closed ? `Empezar semana ${summary.weekNumber + 1}` : 'Seguir con la semana';

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md px-4 py-10 text-white">
      <ViewedAtPinger weekNumber={summary.weekNumber} />

      <Card variant="hero" className="relative overflow-hidden p-6">
        <MountainBackdrop />
        <div className="relative flex flex-col items-center text-center">
          <CharacterAvatar character={character} variant="avatar" size="xl" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-cyan">
            Resumen semanal
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight">{heading}</h1>

          <div className="mt-6 grid w-full grid-cols-3 gap-3">
            <Stat
              label="Sesiones"
              value={`${summary.sessionsCompleted}/${summary.sessionsTotal}`}
            />
            <Stat
              label="RPE prom"
              value={summary.averageRPE !== null ? summary.averageRPE.toFixed(1) : '—'}
            />
            <Stat
              label="Dolor dedos"
              value={
                summary.fingerPainAvg !== null ? summary.fingerPainAvg.toFixed(1) : '—'
              }
            />
          </div>

          <p className="mt-6 text-sm leading-6 text-white/82">
            {summary.personalizedMessage}
          </p>

          {summary.currentStreak > 0 ? (
            <p className="mt-3 text-xs font-bold text-brand-mustard">
              🔥 {summary.currentStreak} días seguidos
            </p>
          ) : null}

          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-brand-cyan px-5 py-3 text-sm font-extrabold text-brand-dark transition hover:brightness-110"
          >
            {ctaLabel}
          </Link>
        </div>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-white/55">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}
