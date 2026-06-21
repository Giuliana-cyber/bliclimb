import Link from 'next/link';
import { AlertCircle, ChevronRight, Users } from 'lucide-react';
import { loadCoachContext } from '@/lib/coach/context';
import { getCoachClientSummaries, getCoachRecentCheckIns } from '@/lib/coach/queries';
import { Card } from '@/components/ui/Card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch {
    return value;
  }
}

export default async function CoachDashboardPage() {
  // El layout ya garantiza coach context, pero lo volvemos a leer porque las
  // páginas tienen que ser autosuficientes (Next 14 puede no compartir layout
  // data por defecto).
  const context = await loadCoachContext();
  if (!context) return null;

  const [clients, recentCheckIns] = await Promise.all([
    getCoachClientSummaries(context.userId),
    getCoachRecentCheckIns(context.userId, 8)
  ]);

  const activePlans = clients.filter((c) => c.hasActivePlan).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-white">Hola, {context.name || 'coach'}</h1>
        <p className="text-sm text-white/65">
          {context.currentClients} de {context.maxClients} clientes activos.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/55">Clientes</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{context.currentClients}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/55">Planes activos</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{activePlans}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/55">Check-ins (8 más recientes)</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{recentCheckIns.length}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white">Últimos check-ins</h2>
          <Link
            href="/coach/clients"
            className="text-xs font-bold text-brand-cyan hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {recentCheckIns.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-sm text-white/65">
            <AlertCircle size={16} aria-hidden="true" />
            Aún no hay check-ins de tus clientes.
          </Card>
        ) : (
          <Card className="divide-y divide-white/[0.06] p-0">
            {recentCheckIns.map((c, idx) => (
              <Link
                key={`${c.clientId}-${idx}`}
                href={`/coach/clients/${c.clientId}`}
                className="flex items-center justify-between gap-3 p-3 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {c.clientName || 'Cliente'}
                  </p>
                  <p className="text-[0.7rem] text-white/55">
                    {formatDate(c.date)}
                    {c.rpe != null ? ` · RPE ${c.rpe}` : ''}
                    {c.fingerPain != null && c.fingerPain > 0 ? ` · dolor dedos ${c.fingerPain}` : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-white/35" aria-hidden="true" />
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold text-white">Tus clientes</h2>
        {clients.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm text-white/65">
              Todavía no hay clientes. Invitá a tu primer atleta desde la pestaña{' '}
              <Link href="/coach/clients" className="font-bold text-brand-cyan hover:underline">
                Mis clientes
              </Link>
              .
            </p>
            <Link
              href="/coach/clients"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan px-3 py-1.5 text-xs font-bold text-brand-dark"
            >
              <Users size={14} aria-hidden="true" />
              Invitar cliente
            </Link>
          </Card>
        ) : (
          <Card className="divide-y divide-white/[0.06] p-0">
            {clients.slice(0, 5).map((c) => (
              <Link
                key={c.clientId}
                href={`/coach/clients/${c.clientId}`}
                className="flex items-center justify-between gap-3 p-3 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{c.name || c.email || 'Cliente sin datos'}</p>
                  <p className="text-[0.7rem] text-white/55">
                    {c.level || 'nivel —'} ·{' '}
                    {c.hasActivePlan ? 'plan activo' : 'sin plan'} · último check-in{' '}
                    {formatDate(c.lastCheckInAt)}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-white/35" aria-hidden="true" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
