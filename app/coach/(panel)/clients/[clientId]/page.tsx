import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ClipboardList, Sparkles } from 'lucide-react';
import { loadCoachContext } from '@/lib/coach/context';
import { getClientDetailForCoach } from '@/lib/coach/queries';
import { Card } from '@/components/ui/Card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return value;
  }
}

export default async function CoachClientDetailPage({
  params
}: {
  params: { clientId: string };
}) {
  const context = await loadCoachContext();
  if (!context) return null;

  const client = await getClientDetailForCoach(context.userId, params.clientId);
  if (!client) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-1 text-xs font-bold text-white/55 hover:text-brand-cyan"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Mis clientes
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white">{client.name || 'Sin nombre'}</h1>
        <p className="text-xs text-white/55">
          {client.email ?? '—'} · {client.level ?? 'nivel —'}
        </p>
      </header>

      {/* Plan activo */}
      <section className="space-y-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-white/55">Plan activo</h2>
        {client.activePlan ? (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-brand-cyan" aria-hidden="true" />
              <p className="text-sm font-bold text-white">
                {client.activePlan.source === 'coach' ? 'Plan tuyo' : 'Plan generado por BilClimb'}
              </p>
            </div>
            <p className="text-xs text-white/65">
              Semana {client.activePlan.currentWeek} / {client.activePlan.totalWeeks} · inicio{' '}
              {formatDate(client.activePlan.startDate)}
            </p>
          </Card>
        ) : (
          <Card className="p-4 text-sm text-white/65">
            Este cliente no tiene plan activo todavía.
          </Card>
        )}
        <Link
          href={`/coach/plans/new?clientId=${client.clientId}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan px-3 py-1.5 text-xs font-bold text-brand-dark"
        >
          <Sparkles size={12} aria-hidden="true" />
          Crear plan para este cliente
        </Link>
      </section>

      {/* Perfil */}
      <section className="space-y-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-white/55">Perfil</h2>
        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Días/semana" value={client.daysPerWeek?.toString() ?? '—'} />
          <Field label="Sesión (min)" value={client.sessionDuration?.toString() ?? '—'} />
          <Field
            label="Objetivos"
            value={client.goals.length ? client.goals.join(', ') : '—'}
          />
          <Field
            label="Equipo"
            value={client.equipment.length ? client.equipment.join(', ') : '—'}
          />
          <Field
            label="Lesiones"
            value={client.injuries.length ? client.injuries.join(', ') : 'Sin lesiones'}
          />
        </Card>
      </section>

      {/* Fuerza */}
      <section className="space-y-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-white/55">Fuerza actual</h2>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Field
            label="Pull-ups BW (max)"
            value={client.pullupsBodyweight?.toString() ?? '—'}
          />
          <Field
            label="Regleta 20mm (s)"
            value={client.hangboard20mmSeconds?.toString() ?? '—'}
          />
          <Field label="Banca 1RM" value={client.benchPress1Rm?.toString() ?? '—'} />
          <Field label="Sentadilla 1RM" value={client.squat1Rm?.toString() ?? '—'} />
          <Field label="Peso muerto 1RM" value={client.deadlift1Rm?.toString() ?? '—'} />
        </Card>
      </section>

      {/* Check-ins */}
      <section className="space-y-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-white/55">
          Últimos check-ins
        </h2>
        {client.recentCheckIns.length === 0 ? (
          <Card className="p-4 text-sm text-white/65">Aún no hay check-ins.</Card>
        ) : (
          <Card className="divide-y divide-white/[0.06] p-0">
            {client.recentCheckIns.map((c, idx) => (
              <div key={`${c.date}-${idx}`} className="space-y-1 p-3">
                <p className="text-xs font-bold text-white">{formatDate(c.date)}</p>
                <p className="text-[0.7rem] text-white/65">
                  RPE {c.rpe ?? '—'}
                  {c.fingerPain != null ? ` · dolor dedos ${c.fingerPain}` : ''}
                  {c.energy != null ? ` · energía ${c.energy}` : ''}
                </p>
                {c.notes ? <p className="text-xs text-white/80">{c.notes}</p> : null}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-0.5 text-sm text-white/85">{value}</p>
    </div>
  );
}
