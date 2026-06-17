import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

type Props = {
  /** Fecha en la que el mes gratis termina (ISO). Si null, no se renderiza. */
  freePlanExpiresAt: string | null;
  /** Si tiene suscripción activa, no mostramos nada. */
  hasActiveSubscription: boolean;
  /** Etiqueta de precio. Default: "$249 MXN/año". */
  priceLabel?: string;
};

function formatDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function daysRemaining(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function FreePlanWindowBanner({
  freePlanExpiresAt,
  hasActiveSubscription,
  priceLabel = '$249 MXN/año'
}: Props) {
  if (hasActiveSubscription) return null;
  if (!freePlanExpiresAt) return null;

  const expiresAt = new Date(freePlanExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  if (expiresAt.getTime() <= Date.now()) return null;

  const dateLabel = formatDate(freePlanExpiresAt);
  const days = daysRemaining(freePlanExpiresAt);

  return (
    <div className="rounded-2xl border border-brand-cyan/25 bg-brand-cyan/[0.05] p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
          <Sparkles aria-hidden="true" size={16} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
            Mes gratis
          </p>
          <p className="mt-1 text-sm leading-6 text-white/82">
            {dateLabel ? (
              <>
                Estás en tu mes de plan gratuito. Termina el{' '}
                <span className="font-bold text-white">{dateLabel}</span>
                {days <= 7 ? ` (en ${days} día${days === 1 ? '' : 's'})` : null}. Después
                podés continuar suscribiéndote por {priceLabel}.
              </>
            ) : (
              `Estás en tu mes de plan gratuito. Suscribite a ${priceLabel} cuando quieras seguir.`
            )}
          </p>
          {days <= 7 ? (
            <Link
              href="/subscribe"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-cyan hover:underline"
            >
              Suscribirme ahora
              <ArrowRight aria-hidden="true" size={13} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
