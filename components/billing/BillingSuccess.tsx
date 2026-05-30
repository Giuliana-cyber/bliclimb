'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';

export function BillingSuccess() {
  const [status, setStatus] = useState<'loading' | 'active' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu suscripción con Mercado Pago...');
  const [preapprovalId, setPreapprovalId] = useState('');

  async function verifySubscription(subscriptionId: string) {
    setStatus('loading');
    setMessage('Verificando tu suscripción con Mercado Pago...');

    try {
      const response = await fetch(
        `/api/billing/verify-subscription?preapproval_id=${encodeURIComponent(subscriptionId)}`
      );
      const data = (await response.json()) as {
        active?: boolean;
        error?: string;
        message?: string;
        status?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'No pudimos confirmar la suscripción.');
      }

      if (data.active) {
        setStatus('active');
        setMessage('Tu suscripción está activa. Ya puedes usar BilClimb.ai.');
        window.localStorage.removeItem('bilclimb:last-preapproval-id');
        return;
      }

      setStatus('pending');
      setMessage(
        `Mercado Pago todavía reporta esta suscripción como "${data.status ?? 'pendiente'}". Si acabas de pagar, espera unos segundos y vuelve a intentar.`
      );
    } catch (caughtError) {
      setStatus('error');
      setMessage(caughtError instanceof Error ? caughtError.message : 'No pudimos verificar tu pago.');
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const storedPreapprovalId =
      searchParams.get('preapproval_id') ??
      searchParams.get('preapprovalId') ??
      searchParams.get('id') ??
      window.localStorage.getItem('bilclimb:last-preapproval-id');

    if (!storedPreapprovalId) {
      setStatus('error');
      setMessage('No encontramos el ID de suscripción de Mercado Pago.');
      return;
    }

    setPreapprovalId(storedPreapprovalId);
    void verifySubscription(storedPreapprovalId);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center shadow-glow">
        <div className="mx-auto grid size-14 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
          {status === 'loading' ? (
            <Loader2 aria-hidden="true" size={27} className="animate-spin" />
          ) : status === 'pending' ? (
            <Clock3 aria-hidden="true" size={29} strokeWidth={2.4} />
          ) : status === 'error' ? (
            <AlertTriangle aria-hidden="true" size={29} strokeWidth={2.4} />
          ) : (
            <CheckCircle2 aria-hidden="true" size={29} strokeWidth={2.4} />
          )}
        </div>
        <h1 className="mt-5 text-3xl font-bold">
          {status === 'active'
            ? 'Suscripción activa'
            : status === 'pending'
              ? 'Pago en proceso'
              : 'Confirmando suscripción'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/68">{message}</p>

        {preapprovalId && status !== 'active' ? (
          <button
            type="button"
            onClick={() => void verifySubscription(preapprovalId)}
            disabled={status === 'loading'}
            className="mt-6 flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90 disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/42"
          >
            Reintentar verificación
          </button>
        ) : null}

        <Link
          href="/"
          className={[
            'flex w-full items-center justify-center rounded-md px-4 py-4 text-base font-bold transition',
            status === 'active'
              ? 'mt-6 bg-brand-cyan text-brand-dark hover:bg-brand-cyan/90'
              : 'mt-3 border border-white/12 text-white/72 hover:bg-white/[0.05]'
          ].join(' ')}
        >
          Ir al dashboard
        </Link>
      </section>
    </main>
  );
}
