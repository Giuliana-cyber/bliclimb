import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { loadCoachContext } from '@/lib/coach/context';
import { getCoachClientSummaries } from '@/lib/coach/queries';
import { Card } from '@/components/ui/Card';
import { InviteClientButton } from '@/components/coach/InviteClientButton';

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

export default async function CoachClientsPage() {
  const context = await loadCoachContext();
  if (!context) return null;

  const clients = await getCoachClientSummaries(context.userId);
  const limitReached = context.currentClients >= context.maxClients;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Mis clientes</h1>
          <p className="text-sm text-white/65">
            {context.currentClients} de {context.maxClients} cupos usados.
          </p>
        </div>
        {limitReached ? (
          <Link
            href="/coach/upgrade"
            className="rounded-xl border border-brand-mustard/40 bg-brand-mustard/[0.08] px-3 py-2 text-xs font-bold text-brand-mustard hover:brightness-110"
          >
            Subí de plan para invitar más
          </Link>
        ) : (
          <InviteClientButton />
        )}
      </header>

      {clients.length === 0 ? (
        <Card className="space-y-3 p-6 text-center">
          <Users className="mx-auto text-brand-cyan" size={28} aria-hidden="true" />
          <p className="text-sm font-bold text-white">Aún no tenés clientes</p>
          <p className="text-xs text-white/65">
            Generá una invitación y compartila con tu atleta para empezar.
          </p>
          {limitReached ? null : (
            <div className="flex justify-center">
              <InviteClientButton />
            </div>
          )}
        </Card>
      ) : (
        <Card className="divide-y divide-white/[0.06] p-0">
          {clients.map((c) => (
            <Link
              key={c.clientId}
              href={`/coach/clients/${c.clientId}`}
              className="flex items-center justify-between gap-3 p-3 transition hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {c.name || 'Sin nombre'}
                </p>
                <p className="text-[0.7rem] text-white/55">
                  {c.level || 'nivel —'} · {c.hasActivePlan ? 'plan activo' : 'sin plan'} · check-in{' '}
                  {formatDate(c.lastCheckInAt)}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-white/35" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
