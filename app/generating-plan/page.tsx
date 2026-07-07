'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, ClipboardList, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { RateLimitBanner } from '@/components/ui/RateLimitBanner';
import { clearProfileNeedsRegeneration, loadProfile } from '@/lib/profile';
import { saveTrainingPlan, type TrainingPlan } from '@/lib/plan';

const generationSteps = [
  { label: 'Analizando tu perfil…', icon: Activity },
  { label: 'Diseñando tu periodización…', icon: ClipboardList },
  { label: 'Adaptando a tu equipo disponible…', icon: Sparkles },
  { label: 'Verificando seguridad del plan…', icon: ShieldCheck },
  { label: '¡Listo!', icon: CheckCircle2 }
];

const RATE_LIMIT_UI_MESSAGE =
  'Llegamos al límite temporal de generación. Espera unos segundos y reintenta.';

function getFriendlyGenerationError(message: string) {
  const normalized = message.toLowerCase();
  const isTechnicalRateLimit =
    normalized.includes('429') ||
    normalized.includes('rate limit') ||
    normalized.includes('tokens per min') ||
    normalized.includes('requested') ||
    normalized.includes('organization') ||
    normalized.includes('platform.openai.com');
  return isTechnicalRateLimit ? RATE_LIMIT_UI_MESSAGE : message;
}

export default function GeneratingPlanPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [status, setStatus] = useState<'generating' | 'success' | 'error'>('generating');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    seconds: number | null;
    message: string;
  } | null>(null);
  const currentStep = generationSteps[stepIndex];
  const CurrentIcon = currentStep.icon;

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    async function generatePlan() {
      const profile = loadProfile();
      setHasProfile(Boolean(profile));

      if (!profile) {
        setStatus('error');
        setError('Primero necesitamos tu perfil completo.');
        return;
      }

      try {
        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile })
        });

        const data = (await response.json()) as {
          plan?: TrainingPlan;
          error?: string;
          code?: string;
          resetSeconds?: number;
        };

        if (response.status === 402 || data.code === 'subscription_required') {
          setNeedsSubscription(true);
        }

        // Rate limit propio del servidor (no de OpenAI) — UI con contador.
        if (response.status === 429 && data.code === 'rate_limited') {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null;
          const seconds =
            typeof data.resetSeconds === 'number'
              ? data.resetSeconds
              : Number.isFinite(retryAfter)
                ? retryAfter
                : null;
          setRateLimit({
            seconds,
            message:
              'Para evitar gastos altos en IA limitamos la generación de planes. Vuelve a intentar en {{seconds}}.'
          });
          setStatus('error');
          return;
        }

        if (!response.ok || !data.plan) {
          // Capturamos el code para que el renderizado del banner pueda
          // discriminar entre errores fríos vs mensajes user-facing warm.
          setErrorCode(data.code ?? null);
          const message =
            data.code === 'openai_rate_limited'
              ? RATE_LIMIT_UI_MESSAGE
              : getFriendlyGenerationError(data.error ?? 'No pudimos generar tu plan.');
          throw new Error(message);
        }

        saveTrainingPlan(data.plan);
        clearProfileNeedsRegeneration();
        setStepIndex(generationSteps.length - 1);
        setStatus('success');

        window.setTimeout(() => router.push('/plan'), 1200);
      } catch (caughtError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(caughtError);
        }
        setStatus('error');
        setError(
          caughtError instanceof Error
            ? getFriendlyGenerationError(caughtError.message)
            : 'No pudimos generar tu plan.'
        );
      }
    }

    void generatePlan();
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        if (status !== 'generating') return current;
        return current >= generationSteps.length - 2 ? current : current + 1;
      });
    }, 1800);
    return () => window.clearInterval(interval);
  }, [status]);

  const progress = useMemo(() => ((stepIndex + 1) / generationSteps.length) * 100, [stepIndex]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <header className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">
            BilClimb.ai
          </p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">Generando tu plan</h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Convirtiendo tu perfil en una estructura de entrenamiento clara y segura.
          </p>
        </header>

        <Card variant="hero" className="relative overflow-hidden">
          <MountainBackdrop />
          <div className="relative">
            <div className="relative mx-auto mb-6 grid size-28 place-items-center">
              <div className="absolute inset-0 rounded-full border border-brand-cyan/20" />
              <div className="absolute inset-3 animate-ping rounded-full border border-brand-cyan/30" />
              <div className="grid size-20 place-items-center rounded-full bg-gradient-cyan text-brand-dark shadow-glow-strong">
                <CurrentIcon aria-hidden="true" size={34} strokeWidth={2.2} />
              </div>
            </div>

            <p className="min-h-7 text-center text-base font-extrabold text-white">
              {status === 'error' ? 'Necesitamos ajustar algo' : currentStep.label}
            </p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-cyan shadow-glow"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            <div className="mt-6 space-y-2">
              {generationSteps.map((step, index) => {
                const StepIcon = step.icon;
                const complete = index <= stepIndex;
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      complete
                        ? 'border-brand-cyan/30 bg-brand-cyan/[0.06]'
                        : 'border-white/8 bg-white/[0.02]'
                    }`}
                  >
                    <StepIcon
                      aria-hidden="true"
                      size={16}
                      className={complete ? 'text-brand-cyan' : 'text-white/35'}
                    />
                    <span className={complete ? 'text-sm font-bold text-white/85' : 'text-sm text-white/45'}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {status === 'error' ? (
          <div className="mt-5 space-y-3">
            {rateLimit ? (
              <RateLimitBanner
                resetSeconds={rateLimit.seconds}
                message={rateLimit.message}
                onExpire={() => {
                  setRateLimit(null);
                  hasStartedRef.current = false;
                  window.location.reload();
                }}
              />
            ) : errorCode === 'plan_unsafe_after_retry' ? (
              // Fallback #17 del middleware — el server nos manda un mensaje
              // pensado para el usuario (voz de Bill, tono cálido, orientado
              // a la acción). Lo mostramos con envoltorio cyan/Sparkles en
              // vez del "No pudimos generar" mustard para no pisar el tono
              // del mensaje. Todos los demás errores siguen frío por defecto.
              <Banner
                tone="cyan"
                icon={Sparkles}
                title="Ajustemos algo antes de armar tu plan"
                description={error}
              />
            ) : (
              <Banner tone="mustard" title="No pudimos generar" description={error} />
            )}
            {!hasProfile ? (
              <Button variant="mustard" href="/onboarding" size="lg" className="w-full">
                Volver al onboarding
              </Button>
            ) : needsSubscription ? (
              <Button variant="mustard" href="/subscribe" size="lg" className="w-full">
                Activar suscripción
              </Button>
            ) : errorCode === 'plan_unsafe_after_retry' ? (
              // Fallback #17 · audit-360 fix: el usuario tenía solo "Reintentar",
              // que con el mismo perfil devolvía el mismo fallback en loop. Ahora
              // el primario lleva a editar el perfil; "Reintentar con el perfil
              // actual" queda como opción explícita y honesta.
              <>
                <Button
                  href="/profile"
                  size="lg"
                  className="w-full"
                >
                  Ajustar mi perfil
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-3 w-full"
                  onClick={() => window.location.reload()}
                >
                  Reintentar con el perfil actual
                </Button>
              </>
            ) : (
              <Button
                variant="mustard"
                size="lg"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            )}
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="mt-5">
            <Banner
              tone="cyan"
              icon={CheckCircle2}
              title="Plan guardado"
              description="Te llevamos a la vista completa."
            />
          </div>
        ) : null}
      </motion.section>
    </main>
  );
}
