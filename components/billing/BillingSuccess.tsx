'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';

export function BillingSuccess() {
  const [status, setStatus] = useState<'loading' | 'active' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu suscripción con Mercado Pago…');
  const [preapprovalId, setPreapprovalId] = useState('');

  async function verifySubscription(subscriptionId: string) {
    setStatus('loading');
    setMessage('Verificando tu suscripción con Mercado Pago…');

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
      setMessage(
        caughtError instanceof Error ? caughtError.message : 'No pudimos verificar tu pago.'
      );
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

  const Icon =
    status === 'loading'
      ? Loader2
      : status === 'pending'
        ? Clock3
        : status === 'error'
          ? AlertTriangle
          : CheckCircle2;

  const title =
    status === 'active'
      ? 'Suscripción activa'
      : status === 'pending'
        ? 'Pago en proceso'
        : status === 'error'
          ? 'No pudimos confirmar'
          : 'Confirmando suscripción';

  const accent =
    status === 'active'
      ? 'bg-gradient-cyan text-brand-dark shadow-glow'
      : status === 'pending'
        ? 'bg-brand-mustard/15 text-brand-mustard'
        : status === 'error'
          ? 'bg-red-400/15 text-red-300'
          : 'bg-brand-cyan/15 text-brand-cyan';

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card variant="hero" className="relative overflow-hidden text-center">
          <MountainBackdrop />
          <div className="relative">
            <div
              className={`mx-auto grid size-14 place-items-center rounded-2xl ${accent}`}
            >
              <Icon
                aria-hidden="true"
                size={28}
                strokeWidth={2.4}
                className={status === 'loading' ? 'animate-spin' : undefined}
              />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">{message}</p>

            {preapprovalId && status !== 'active' ? (
              <Button
                type="button"
                onClick={() => void verifySubscription(preapprovalId)}
                disabled={status === 'loading'}
                size="lg"
                className="mt-6 w-full"
              >
                Reintentar verificación
              </Button>
            ) : null}

            <Button
              href="/"
              variant={status === 'active' ? 'primary' : 'secondary'}
              size="lg"
              className={status === 'active' ? 'mt-6 w-full' : 'mt-3 w-full'}
            >
              Ir al dashboard
            </Button>
          </div>
        </Card>
      </motion.section>
    </main>
  );
}
