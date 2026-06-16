'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calendar, CheckCircle2, CreditCard, PauseCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type SubscriptionPanelData = {
  status: 'active' | 'paused' | 'cancelled' | 'past_due' | 'pending' | null;
  currentPeriodEnd: string | null;
  freePlanUsedAt: string | null;
  hasActiveAccess: boolean;
};

function formatDateLong(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatDateShort(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(date);
}

type Tone = 'cyan' | 'mustard' | 'neutral' | 'danger';

type StatusCopy = {
  badge: string;
  tone: Tone;
  description: string;
};

function statusCopy(data: SubscriptionPanelData): StatusCopy {
  if (data.status === 'active') {
    const end = formatDateLong(data.currentPeriodEnd);
    return {
      badge: 'Activa',
      tone: 'cyan',
      description: end
        ? `Próximo cobro: ${end}.`
        : 'Tu suscripción está activa.'
    };
  }
  if (data.status === 'cancelled' && data.currentPeriodEnd) {
    const end = formatDateLong(data.currentPeriodEnd);
    const date = new Date(data.currentPeriodEnd);
    const stillActive = !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    return {
      badge: stillActive ? `Cancelada (acceso hasta ${formatDateShort(data.currentPeriodEnd)})` : 'Cancelada',
      tone: stillActive ? 'mustard' : 'neutral',
      description: stillActive
        ? `Cancelaste la renovación. Conservás acceso hasta ${end}.`
        : 'Tu suscripción terminó. Suscribite de nuevo cuando quieras.'
    };
  }
  if (data.status === 'paused') {
    return {
      badge: 'Pausada',
      tone: 'mustard',
      description:
        'Tu suscripción está pausada en Mercado Pago. Reanudala desde tu cuenta de MP para recuperar el acceso.'
    };
  }
  if (data.status === 'past_due') {
    return {
      badge: 'Pago vencido',
      tone: 'danger',
      description: 'Mercado Pago no pudo cobrarte. Revisá tu método de pago.'
    };
  }
  if (data.status === 'pending') {
    return {
      badge: 'Pendiente',
      tone: 'mustard',
      description:
        'Estamos esperando que Mercado Pago confirme tu pago. Refrescá esta página en unos minutos.'
    };
  }
  return {
    badge: 'Sin suscripción',
    tone: 'neutral',
    description: data.freePlanUsedAt
      ? 'Ya usaste tu plan gratuito. Suscribite para generar más planes y mantener acceso al chat.'
      : 'Generá tu primer plan gratis. La suscripción se activa cuando lo necesites.'
  };
}

const TONE_CLASSES: Record<Tone, { wrapper: string; badge: string; icon: string }> = {
  cyan: {
    wrapper: 'border-brand-cyan/30 bg-brand-cyan/[0.08]',
    badge: 'bg-brand-cyan/15 text-brand-cyan',
    icon: 'text-brand-cyan'
  },
  mustard: {
    wrapper: 'border-brand-mustard/35 bg-brand-mustard/[0.08]',
    badge: 'bg-brand-mustard/15 text-brand-mustard',
    icon: 'text-brand-mustard'
  },
  danger: {
    wrapper: 'border-red-400/35 bg-red-400/[0.08]',
    badge: 'bg-red-400/15 text-red-200',
    icon: 'text-red-300'
  },
  neutral: {
    wrapper: 'border-white/10 bg-white/[0.04]',
    badge: 'bg-white/10 text-white/70',
    icon: 'text-white/60'
  }
};

function StatusIcon({ status, className }: { status: SubscriptionPanelData['status']; className: string }) {
  const props = { size: 19, strokeWidth: 2.3, 'aria-hidden': true as const, className } as const;
  if (status === 'active') return <CheckCircle2 {...props} />;
  if (status === 'past_due') return <AlertTriangle {...props} />;
  if (status === 'paused' || status === 'pending') return <PauseCircle {...props} />;
  if (status === 'cancelled') return <Calendar {...props} />;
  return <CreditCard {...props} />;
}

export function SubscriptionPanel({ data }: { data: SubscriptionPanelData }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = statusCopy(data);
  const tone = TONE_CLASSES[copy.tone];
  const canCancel = data.status === 'active';
  const endShort = formatDateShort(data.currentPeriodEnd);

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/cancel-subscription', { method: 'POST' });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No pudimos cancelar tu suscripción.');
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No pudimos cancelar tu suscripción.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className={`!p-5 ${tone.wrapper}`}>
        <div className="flex items-start gap-3">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone.badge.replace(
              'text-',
              'bg-'
            )} ${tone.badge}`}
          >
            <StatusIcon status={data.status} className={tone.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.10em] text-white/55">
              Mi suscripción
            </p>
            <p className="mt-1 text-base font-extrabold text-white">{copy.badge}</p>
            <p className="mt-1 text-sm leading-6 text-white/72">{copy.description}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {canCancel ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(true)}
              className="w-full"
            >
              Cancelar suscripción
            </Button>
          ) : data.hasActiveAccess ? null : (
            <Button href="/subscribe" className="w-full">
              {data.status === 'cancelled' ? 'Volver a suscribirme' : 'Suscribirme'}
            </Button>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}
      </Card>

      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar cancelación"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-extrabold text-white">¿Cancelar suscripción?</h3>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                aria-label="Cerrar"
                className="grid size-9 place-items-center rounded-xl border border-white/10 text-white/65 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              {endShort
                ? `Conservás acceso hasta el ${endShort}. Después podés volver a suscribirte cuando quieras.`
                : 'Tu acceso a planes y chat se mantiene hasta el final del período pagado.'}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="w-full"
              >
                No, mantener activa
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
            {error ? (
              <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
