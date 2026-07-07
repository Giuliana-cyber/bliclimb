'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { loadLocalSession } from '@/lib/session';

type BillingCycle = 'monthly' | 'annual';

const PLANS: Record<
  BillingCycle,
  { price: string; cadence: string; equivalent?: string; savingsBadge?: string; copy: string }
> = {
  monthly: {
    price: '$29 MXN',
    cadence: '/ mes',
    copy: 'Cancela cuando quieras.'
  },
  annual: {
    price: '$249 MXN',
    cadence: '/ año',
    equivalent: 'Equivalente a $20.75 / mes',
    savingsBadge: 'Ahorra 28%',
    copy: 'Un solo pago al año. Se renueva automáticamente.'
  }
};

export function SubscribeCard({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = loadLocalSession();
    if (session?.email) setEmail(session.email);
  }, []);

  async function startCheckout() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, billingCycle: cycle })
      });
      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        const detail = data.detail ? `${data.error ?? 'error'} — ${data.detail}` : data.error;
        throw new Error(detail ?? 'No pudimos abrir el checkout.');
      }
      window.location.href = data.checkoutUrl;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos abrir Stripe.');
      setLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={
        compact
          ? 'space-y-4'
          : 'mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12 text-white'
      }
    >
      <Card variant="hero" className="relative overflow-hidden !p-6">
        <MountainBackdrop />
        <div className="relative">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-cyan text-brand-dark shadow-glow">
            <Sparkles aria-hidden="true" size={22} strokeWidth={2.4} />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-brand-mustard">
            BilClimb.ai Pro
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">
            Empieza con 30 días gratis
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Pruebas planes y chat sin cargo. Después eliges cómo seguir.
          </p>

          <fieldset
            className="mt-6 grid gap-3 sm:grid-cols-2"
            aria-label="Elige tu ciclo de cobro"
          >
            <PlanOption
              cycle="annual"
              selected={cycle === 'annual'}
              onSelect={() => setCycle('annual')}
            />
            <PlanOption
              cycle="monthly"
              selected={cycle === 'monthly'}
              onSelect={() => setCycle('monthly')}
            />
          </fieldset>

          <div className="mt-5 space-y-3 text-sm leading-6 text-white/76">
            <Bullet
              icon={CalendarClock}
              text="30 días gratis para probar planes y chat sin pagar."
            />
            <Bullet
              icon={ShieldCheck}
              text="Planes personalizados con guardrails y chat contextual."
            />
            <Bullet icon={CreditCard} text="Pago seguro vía Stripe. Cancelas cuando quieras." />
            <Bullet
              icon={Clock3}
              text="Se cobra automáticamente al terminar los 30 días si no cancelas. Cancelar toma un click desde Ajustes."
            />
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-extrabold text-white/82">
              Email para tu suscripción
            </span>
            <input
              value={email}
              inputMode="email"
              placeholder="tu@email.com"
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-brand-deep/40 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60"
            />
          </label>

          {error ? (
            <div className="mt-4">
              <Banner tone="mustard" title="No pudimos abrir el checkout" description={error} />
            </div>
          ) : null}

          <Button
            type="button"
            onClick={startCheckout}
            disabled={loading || !email.trim()}
            size="lg"
            className="mt-6 w-full"
            icon={loading ? <Loader2 size={18} className="animate-spin" /> : undefined}
          >
            Empezar 30 días gratis
          </Button>

          {!compact ? (
            <Button variant="secondary" href="/" size="lg" className="mt-3 w-full">
              Volver
            </Button>
          ) : null}
        </div>
      </Card>
    </motion.section>
  );
}

function PlanOption({
  cycle,
  selected,
  onSelect
}: {
  cycle: BillingCycle;
  selected: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[cycle];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        'relative rounded-2xl border p-4 text-left transition-all active:scale-[0.99]',
        selected
          ? 'border-brand-cyan/60 bg-brand-cyan/[0.08] shadow-glow'
          : 'border-white/10 bg-white/[0.03] hover:border-white/22'
      ].join(' ')}
    >
      {plan.savingsBadge ? (
        <span className="absolute -top-2 right-3 rounded-full bg-brand-mustard px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-brand-dark">
          {plan.savingsBadge}
        </span>
      ) : null}
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">
        {cycle === 'annual' ? 'Anual' : 'Mensual'}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-white">
        {plan.price}
        <span className="ml-1 text-sm font-bold text-white/55">{plan.cadence}</span>
      </p>
      {plan.equivalent ? (
        <p className="mt-1 text-xs text-white/55">{plan.equivalent}</p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-white/70">{plan.copy}</p>
      {selected ? (
        <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand-cyan text-brand-dark">
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}

function Bullet({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-cyan/14 text-brand-cyan">
        <Icon aria-hidden="true" size={15} strokeWidth={2.4} />
      </span>
      <span>{text}</span>
    </div>
  );
}
