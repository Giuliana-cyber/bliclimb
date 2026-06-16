'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';

type Props = {
  /**
   * Segundos hasta que el límite expire.
   * Si es null/undefined, mostramos solo el mensaje sin contador.
   */
  resetSeconds: number | null;
  /**
   * Mensaje base. Si incluye {{seconds}} lo reemplazamos con el contador
   * humano (p.ej. "30 segundos" / "5 minutos").
   */
  message: string;
  onExpire?: () => void;
};

function humanize(seconds: number): string {
  if (seconds <= 0) return '0 segundos';
  if (seconds < 60) return `${Math.ceil(seconds)} segundos`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hora${hours === 1 ? '' : 's'}`;
}

export function RateLimitBanner({ resetSeconds, message, onExpire }: Props) {
  const [remaining, setRemaining] = useState<number | null>(resetSeconds);

  useEffect(() => {
    setRemaining(resetSeconds);
  }, [resetSeconds]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current === null) return null;
        const next = current - 1;
        if (next <= 0) {
          window.clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [remaining === null, onExpire]); // eslint-disable-line react-hooks/exhaustive-deps

  const display =
    remaining !== null
      ? message.replace('{{seconds}}', humanize(remaining))
      : message.replace('{{seconds}}', 'unos segundos');

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-brand-mustard/35 bg-brand-mustard/[0.08] p-4"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-mustard/15 text-brand-mustard">
        <Clock3 aria-hidden="true" size={19} strokeWidth={2.3} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-brand-mustard">Espera un momento</p>
        <p className="mt-1 text-sm leading-6 text-white/78">{display}</p>
      </div>
    </div>
  );
}
