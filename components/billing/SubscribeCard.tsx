'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { loadLocalSession } from '@/lib/session';

const PRICE_LABEL = '$249 MXN / año';
const TRIAL_LABEL = '30 días gratis';

export function SubscribeCard({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email })
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
      setError(
        caughtError instanceof Error ? caughtError.message : 'No pudimos abrir Stripe.'
      );
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
            Entrena con IA por {PRICE_LABEL}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Empezás con {TRIAL_LABEL}. Después, $249 MXN una vez al año — sin meses
            recurrentes ni sorpresas.
          </p>

          <div className="mt-5 space-y-3 text-sm leading-6 text-white/76">
            <Bullet
              icon={CalendarClock}
              text={`${TRIAL_LABEL} para probar planes y chat sin pagar.`}
            />
            <Bullet
              icon={ShieldCheck}
              text="Planes personalizados con guardrails y chat contextual."
            />
            <Bullet icon={CreditCard} text="Cobro anual seguro vía Stripe. Cancelás cuando querés." />
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
            Empezar {TRIAL_LABEL}
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
