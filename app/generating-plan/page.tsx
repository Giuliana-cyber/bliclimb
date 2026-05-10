'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, ClipboardList, ShieldCheck, Sparkles } from 'lucide-react';
import { clearProfileNeedsRegeneration, loadProfile } from '@/lib/profile';
import { saveTrainingPlan, type TrainingPlan } from '@/lib/plan';

const generationSteps = [
  {
    label: 'Analizando tu perfil...',
    icon: Activity
  },
  {
    label: 'Diseñando tu periodización...',
    icon: ClipboardList
  },
  {
    label: 'Adaptando a tu equipo disponible...',
    icon: Sparkles
  },
  {
    label: 'Verificando seguridad del plan...',
    icon: ShieldCheck
  },
  {
    label: '¡Listo!',
    icon: CheckCircle2
  }
];

export default function GeneratingPlanPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);
  const [status, setStatus] = useState<'generating' | 'success' | 'error'>('generating');
  const [error, setError] = useState('');
  const currentStep = generationSteps[stepIndex];
  const CurrentIcon = currentStep.icon;

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ profile })
        });

        const data = (await response.json()) as { plan?: TrainingPlan; error?: string };

        if (!response.ok || !data.plan) {
          throw new Error(data.error ?? 'No pudimos generar tu plan.');
        }

        saveTrainingPlan(data.plan);
        clearProfileNeedsRegeneration();
        setStepIndex(generationSteps.length - 1);
        setStatus('success');

        window.setTimeout(() => {
          router.push('/plan');
        }, 1200);
      } catch (caughtError) {
        setStatus('error');
        setError(caughtError instanceof Error ? caughtError.message : 'No pudimos generar tu plan.');
      }
    }

    void generatePlan();
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        if (status !== 'generating') {
          return current;
        }

        return current >= generationSteps.length - 2 ? current : current + 1;
      });
    }, 1800);

    return () => window.clearInterval(interval);
  }, [status]);

  const progress = useMemo(() => {
    return ((stepIndex + 1) / generationSteps.length) * 100;
  }, [stepIndex]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-10 text-white">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-brand-cyan">BilClimb.ai</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Generando tu plan</h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Estamos convirtiendo tu perfil en una estructura de entrenamiento clara y segura.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-glow">
          <div className="relative mx-auto mb-8 grid size-28 place-items-center">
            <div className="absolute inset-0 rounded-full border border-brand-cyan/20" />
            <div className="absolute inset-3 animate-ping rounded-full border border-brand-cyan/30" />
            <div className="grid size-20 place-items-center rounded-full bg-brand-cyan/14 text-brand-cyan">
              <CurrentIcon aria-hidden="true" size={34} strokeWidth={2.2} />
            </div>
          </div>

          <p className="min-h-7 text-center text-lg font-bold text-white">
            {status === 'error' ? 'Necesitamos ajustar algo' : currentStep.label}
          </p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-cyan transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {generationSteps.map((step, index) => {
              const StepIcon = step.icon;
              const complete = index <= stepIndex;

              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <StepIcon
                    aria-hidden="true"
                    size={17}
                    className={complete ? 'text-brand-cyan' : 'text-white/36'}
                  />
                  <span className={complete ? 'text-sm text-white/82' : 'text-sm text-white/42'}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {status === 'error' ? (
          <div className="mt-5 rounded-lg border border-brand-mustard/30 bg-brand-mustard/10 p-4 text-sm leading-6 text-white/78">
            <p>{error}</p>
            {!hasProfile ? (
              <Link href="/onboarding" className="mt-3 inline-block font-bold text-brand-mustard">
                Volver al onboarding
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 font-bold text-brand-mustard"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="mt-5 rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 p-4 text-sm leading-6 text-white/78">
            Plan guardado. Te llevamos a la vista completa.
          </div>
        ) : null}

      </section>
    </main>
  );
}
