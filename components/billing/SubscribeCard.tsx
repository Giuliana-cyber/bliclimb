'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { loadLocalSession } from '@/lib/session';

type BillingStatus = {
  active?: boolean;
  configured?: boolean;
  required?: boolean;
  configError?: string | null;
  billing?: {
    amount: number;
    currency: string;
    sandbox: boolean;
  } | null;
  subscription?: {
    payerEmail?: string;
    expiresAt?: string;
  } | null;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', {
      currency,
      style: 'currency'
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function SubscribeCard({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const session = loadLocalSession();
    if (session?.email) setEmail(session.email);

    async function checkBillingStatus() {
      try {
        const response = await fetch('/api/billing/status');
        const data = (await response.json()) as BillingStatus;
        setBillingStatus(data);
      } catch {
        setBillingStatus(null);
      } finally {
        setCheckingStatus(false);
      }
    }
    void checkBillingStatus();
  }, []);

  const priceLabel = useMemo(() => {
    const billing = billingStatus?.billing;
    if (!billing) return '$1 USD';
    return formatMoney(billing.amount, billing.currency);
  }, [billingStatus]);

  const isBillingConfigured = billingStatus?.configured ?? true;

  async function startCheckout() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = (await response.json()) as {
        preapprovalId?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'No pudimos abrir el checkout.');
      }
      if (data.preapprovalId) {
        window.localStorage.setItem('bilclimb:last-preapproval-id', data.preapprovalId);
      }
      window.location.href = data.url;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos abrir Mercado Pago.');
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
            Entrena con IA por {priceLabel} al mes
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/72">
            La suscripción cubre el uso de OpenAI para generar planes, responder con Senda/Bill y
            mantener tu bitácora inteligente.
          </p>

          {billingStatus?.billing ? (
            <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/60">
              Mercado Pago {billingStatus.billing.sandbox ? 'sandbox' : 'producción'}
            </div>
          ) : null}

          <div className="mt-5 space-y-3 text-sm leading-6 text-white/76">
            <Bullet icon={ShieldCheck} text="Planes personalizados y chat contextual con tu perfil." />
            <Bullet icon={CreditCard} text="Pago mensual seguro con Mercado Pago." />
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-extrabold text-white/82">
              Email para Mercado Pago
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

          {!checkingStatus && !isBillingConfigured ? (
            <div className="mt-4">
              <Banner
                tone="mustard"
                title="Mercado Pago no configurado"
                description={`${billingStatus?.configError ?? 'No encontramos las credenciales.'} Agrega o revisa MERCADO_PAGO_ACCESS_TOKEN en Vercel y vuelve a desplegar.`}
              />
            </div>
          ) : null}

          <Button
            type="button"
            onClick={startCheckout}
            disabled={loading || checkingStatus || !isBillingConfigured || !email.trim()}
            size="lg"
            className="mt-6 w-full"
            icon={loading ? <Loader2 size={18} className="animate-spin" /> : undefined}
          >
            Suscribirme por {priceLabel}/mes
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
