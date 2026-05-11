'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function BillingSuccess() {
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu pago con Stripe...');

  useEffect(() => {
    async function verifySession() {
      const sessionId = new URLSearchParams(window.location.search).get('session_id');

      if (!sessionId) {
        setStatus('error');
        setMessage('No encontramos la sesión de Stripe.');
        return;
      }

      try {
        const response = await fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await response.json()) as { active?: boolean; error?: string };

        if (!response.ok || !data.active) {
          throw new Error(data.error ?? 'No pudimos confirmar la suscripción.');
        }

        setStatus('active');
        setMessage('Tu suscripción está activa. Ya puedes usar BilClimb.ai.');
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
