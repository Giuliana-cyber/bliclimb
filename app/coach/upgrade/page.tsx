'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, ShieldCheck, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { loadLocalSession } from '@/lib/session';

type CoachTier = 'starter' | 'pro' | 'gym';

type TierSpec = {
  id: CoachTier;
  name: string;
  price: string;
  cadence: string;
  maxClients: string;
  features: string[];
  highlight?: boolean;
};

const TIERS: TierSpec[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$199 MXN',
    cadence: '/ mes',
    maxClients: 'Hasta 5 clientes',
    features: [
      'Panel de coach completo',
      'Crear y publicar planes manuales',
      'Ver check-ins de tus atletas',
      'Invitaciones por link'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$499 MXN',
    cadence: '/ mes',
    maxClients: 'Hasta 15 clientes',
    features: [
      'Todo lo de Starter',
      'Más cupos para equipos pequeños',
      'Historial completo por cliente',
      'Soporte prioritario'
    ],
    highlight: true
  },
  {
    id: 'gym',
    name: 'Gym',
    price: '$999 MXN',
    cadence: '/ mes',
    maxClients: 'Clientes ilimitados',
    features: [
      'Todo lo de Pro',
      'Sin límite de clientes',
      'Ideal para gimnasios y escuelas',
      'Onboarding asistido'
    ]
  }
];

export default function CoachUpgradePage() {
  const [email, setEmail] = useState('');
  const [loadingTier, setLoadingTier] = useState<CoachTier | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = loadLocalSession();
    if (session?.email) setEmail(session.email);
  }, []);

  async function startCheckout(tier: CoachTier) {
    setError('');
    if (!email) {
      setError('Necesitamos tu email para crear la cuenta de Stripe.');
      return;
    }
    setLoadingTier(tier);
    try {
      const response = await fetch('/api/coach/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier })
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (response.status === 401) {
        window.location.href = '/sign-in?next=/coach/upgrade';
        return;
      }
      if (!response.ok || !data.checkoutUrl) {
        setError(data.error ?? 'No pudimos iniciar el pago.');
        setLoadingTier(null);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('No pudimos contactar al servidor. Intentá de nuevo.');
      setLoadingTier(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-8">
      <header className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-bold text-brand-cyan">
          <Users size={14} aria-hidden="true" />
          Para entrenadores
        </div>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          Entrena a tus clientes en BilClimb
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-white/72">
          Arma planes manuales para cada atleta, segui sus check-ins y progreso desde un panel
          dedicado. Tus clientes siguen usando la app como siempre — chat con Bill/Senda incluido.
        </p>
      </header>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier, index) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <Card
              className={`flex h-full flex-col gap-4 p-5 ${
                tier.highlight
                  ? 'border-brand-mustard/60 bg-brand-mustard/[0.04] shadow-glow-strong'
                  : ''
              }`}
            >
              {tier.highlight ? (
                <div className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-mustard/20 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-brand-mustard">
                  Más elegido
                </div>
              ) : null}
              <div>
                <p className="text-lg font-extrabold text-white">{tier.name}</p>
                <p className="text-xs font-semibold text-white/60">{tier.maxClients}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                <span className="text-sm font-semibold text-white/55">{tier.cadence}</span>
              </div>
              <ul className="flex-1 space-y-2 text-sm text-white/80">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      aria-hidden="true"
                      size={16}
                      className="mt-0.5 shrink-0 text-brand-cyan"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => startCheckout(tier.id)}
                disabled={loadingTier !== null}
                variant={tier.highlight ? 'primary' : 'secondary'}
                className="w-full"
              >
                {loadingTier === tier.id ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Redirigiendo...
                  </span>
                ) : (
                  `Elegir ${tier.name}`
                )}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/65">
        <ShieldCheck className="mt-0.5 shrink-0 text-brand-cyan" size={16} aria-hidden="true" />
        <p>
          El pago se procesa con Stripe. Podés cancelar cuando quieras desde tu panel.
          Los clientes que ya entrenan contigo siguen con su suscripción individual de BilClimb;
          esto solo cubre tu acceso al panel del coach.
        </p>
      </div>
    </div>
  );
}
