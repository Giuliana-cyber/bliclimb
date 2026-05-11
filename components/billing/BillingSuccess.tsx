'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function BillingSuccess() {
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu suscripción con Mercado Pago...');

  useEffect(() => {
    async function verifySession() {
      const searchParams = new URLSearchParams(window.location.search);
      const preapprovalId =
        searchParams.get('preapproval_id') ??
        searchParams.get('preapprovalId') ??
        searchParams.get('id') ??
        window.localStorage.getItem('bilclimb:last-preapproval-id');

      if (!preapprovalId) {
        setStatus('error');
        setMessage('No encontramos el ID de suscripción de Mercado Pago.');
        return;
      }

      try {
        const response = await fetch(
          `/api/billing/verify-session?preapproval_id=${encodeURIComponent(preapprovalId)}`
        );
        const data = (await response.json()) as { active?: boolean; error?: string };

        if (!response.ok || !data.active) {
          throw new Error(data.error ?? 'No pudimos confirmar la suscripción.');
        }

        setStatus('active');
        setMessage('Tu suscripción está activa. Ya puedes usar BilClimb.ai.');
        window.localStorage.removeItem('bilclimb:last-preapproval-id');
      } catch (caughtError) {
        setStatus('error');
        setMessage(caughtError instanceof Error ? caughtError.message : 'No pudimos verificar tu pago.');
      }
    }

    void verifySession();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center shadow-glow">
        <div className="mx-auto grid size-14 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
          {status === 'loading' ? (
            <Loader2 aria-hidden="true" size={27} className="animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" size={29} strokeWidth={2.4} />
          )}
        </div>
        <h1 className="mt-5 text-3xl font-bold">
          {status === 'active' ? 'Suscripción activa' : 'Confirmando suscripción'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/68">{message}</p>

        <Link
          href="/"
          className="mt-6 flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          Ir al dashboard
        </Link>
      </section>
    </main>
  );
}
