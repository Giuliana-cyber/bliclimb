'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export function SubscribeCard({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startCheckout() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST'
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'No pudimos abrir el checkout.');
      }

      window.location.href = data.url;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos abrir Stripe.');
      setLoading(false);
    }
  }

  return (
    <section className={compact ? 'space-y-4' : 'mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12 text-white'}>
      <div className="rounded-lg border border-brand-cyan/28 bg-white/[0.04] p-6 shadow-glow">
        <div className="grid size-12 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
          <Sparkles aria-hidden="true" size={24} strokeWidth={2.4} />
        </div>
        <p className="mt-5 text-sm font-bold text-brand-mustard">BilClimb.ai Pro</p>
        <h1 className="mt-2 text-3xl font-bold">Entrena con IA por $1 USD al mes</h1>
        <p className="mt-3 text-sm leading-6 text-white/68">
          La suscripción cubre el uso de OpenAI para generar planes, responder con Senda/Bill y
          mantener la bitácora inteligente funcionando.
        </p>

        <div className="mt-5 grid gap-3 text-sm leading-6 text-white/72">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-brand-cyan" />
            <span>Planes personalizados y chat contextual con tu perfil.</span>
          </div>
          <div className="flex gap-3">
            <CreditCard aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-brand-cyan" />
            <span>Pago mensual seguro con Stripe Checkout.</span>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-brand-mustard/30 bg-brand-mustard/10 p-3 text-sm leading-6 text-white/76">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90 disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/42"
        >
          {loading ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : null}
          Suscribirme por $1/mes
        </button>

        <Link
          href="/"
          className="mt-3 flex w-full items-center justify-center rounded-md border border-white/12 px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.05]"
        >
          Volver
        </Link>
      </div>
    </section>
  );
}
