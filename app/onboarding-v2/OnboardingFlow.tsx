/**
 * OnboardingFlow · client · orchestrator del multi-step.
 *
 * State machine simple:
 *   - useState<StepId> — step actual
 *   - useState<OnboardingState> — datos capturados
 *   - handleNext/Back navegan por STEP_ORDER
 *   - En "resumen" el CTA cierra el flow → /hoy
 *
 * En el piloto no persiste (F4-UI backend conecta a Supabase con
 * POST /api/onboarding). Cada step recibe {state, update} y decide
 * si el CTA está habilitado vía canProceed().
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingShell } from './OnboardingShell';
import { CoachStep } from './steps/CoachStep';
import { GradoStep } from './steps/GradoStep';
import { DedosStep } from './steps/DedosStep';
import { EstiloStep } from './steps/EstiloStep';
import { EquipoStep } from './steps/EquipoStep';
import { SaludStep } from './steps/SaludStep';
import { ResumenStep } from './steps/ResumenStep';
import { INITIAL_STATE, STEP_ORDER, type OnboardingState, type StepId } from './types';

const COACH_QUOTES: Record<StepId, string> = {
  coach: 'Elige quién quieres que te acompañe. Podés cambiarlo cuando quieras.',
  salud: 'Antes que nada, cuidarnos. Unas preguntas rápidas para armar seguro.',
  grado: 'Cuéntame de tu escalada — la de ahora, no la de tus mejores tiempos.',
  dedos: 'Sin examen. Solo para no pedirte de más ni de menos.',
  estilo: 'Ahora lo bueno. ¿Qué escalas y qué te gustaría lograr?',
  equipo: 'Última: tu equipo. Con lo que tengas, armamos algo bueno.',
  resumen: 'Esto es lo que sé de ti. Lo demás lo descubrimos juntos.',
};

const CTA_LABELS: Record<StepId, string> = {
  coach: 'Siguiente',
  salud: 'Siguiente',
  grado: 'Siguiente',
  dedos: 'Siguiente',
  estilo: 'Siguiente',
  equipo: 'Ver mi resultado',
  resumen: 'Ver mi plan',
};

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>('coach');
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (partial: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...partial }));
  };

  const currentIndex = STEP_ORDER.indexOf(step);

  const canProceed = useMemo(() => canProceedFor(step, state), [step, state]);

  // Bloqueo v1 · menores de 16 (Giuliana 2026-07-21). Al elegir esa
  // edad en Salud, no permitimos avanzar y mostramos card cálida.
  const isMinorBlocked = state.edad === 'menor-16';

  const handleNext = async () => {
    if (step === 'resumen') {
      // Cierra el flow · POST /api/onboarding → /hoy
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          setSubmitError(body.message ?? body.error ?? 'No pudimos guardar tu perfil.');
          setSubmitting(false);
          return;
        }
        router.push('/hoy');
      } catch {
        setSubmitError('Sin conexión. Intenta de nuevo.');
        setSubmitting(false);
      }
      return;
    }
    const next = STEP_ORDER[currentIndex + 1];
    if (next) setStep(next);
  };

  const handleBack = () => {
    const prev = STEP_ORDER[currentIndex - 1];
    if (prev) setStep(prev);
  };

  const activeCharacter = state.coach ?? 'bill';

  // Card cálida bloqueo menor de 16 · reemplaza el step de Salud.
  if (isMinorBlocked) {
    return (
      <div className="min-h-screen bg-bil-cream text-bil-ink font-nunito flex items-center px-margin-mobile">
        <div className="max-w-lg mx-auto w-full space-y-6 py-12">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-bil-gold/15 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-bil-gold text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                hourglass_top
              </span>
            </div>
          </div>
          <div className="text-center space-y-3">
            <h1 className="text-headline-lg-mobile text-bil-ink font-bold">
              Todavía no · pero pronto
            </h1>
            <p className="text-body-lg text-bil-ink/75 leading-relaxed">
              BilClimb está pensado para escaladores de 16 años en adelante.
              Cuando cumplas 16 podemos armar tu plan.
            </p>
          </div>
          <div className="bg-white border-l-4 border-bil-green rounded-DEFAULT p-4">
            <p className="text-body-md text-bil-ink/80 leading-snug">
              Mientras tanto, escala con quien te acompaña — coach, mentor,
              padres. La técnica se aprende en el muro, sin dosificación
              externa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ edad: null })}
            className="w-full h-[52px] rounded-full border-2 border-bil-green text-bil-green font-bold text-body-lg active:scale-95 transition-transform"
          >
            Volver
          </button>
          <p className="text-label-md text-bil-ink/50 text-center leading-snug">
            ¿Tienes 16 o más? Volver y ajustar la edad.
          </p>
          <style jsx global>{`
            .material-symbols-outlined {
              font-family: 'Material Symbols Outlined';
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            html,
            body {
              background: #f2ede3;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <OnboardingShell
      stepId={step}
      character={activeCharacter}
      coachQuote={COACH_QUOTES[step]}
      ctaLabel={submitting ? 'Guardando…' : CTA_LABELS[step]}
      ctaDisabled={!canProceed || submitting}
      onCta={handleNext}
      onBack={currentIndex > 0 && !submitting ? handleBack : undefined}
    >
      {submitError && (
        <div className="bg-bil-red/10 border-l-4 border-bil-red rounded-DEFAULT p-3 text-sm text-bil-red">
          {submitError}
        </div>
      )}
      {renderStep(step, state, update)}
    </OnboardingShell>
  );
}

function renderStep(
  step: StepId,
  state: OnboardingState,
  update: (p: Partial<OnboardingState>) => void,
) {
  switch (step) {
    case 'coach':
      return <CoachStep state={state} onSelect={(c) => update({ coach: c })} />;
    case 'grado':
      return <GradoStep state={state} update={update} />;
    case 'dedos':
      return <DedosStep state={state} update={update} />;
    case 'estilo':
      return <EstiloStep state={state} update={update} />;
    case 'equipo':
      return <EquipoStep state={state} update={update} />;
    case 'salud':
      return <SaludStep state={state} update={update} />;
    case 'resumen':
      return <ResumenStep state={state} />;
  }
}

function canProceedFor(step: StepId, s: OnboardingState): boolean {
  switch (step) {
    case 'coach':
      return s.coach !== null;
    case 'grado':
      return s.grado !== null && s.estadoActual !== null;
    case 'dedos':
      // Aceptamos "no sé" (-1) o "guíame" (-2) como respuestas válidas.
      return s.hangSeconds !== null && s.pullups !== null;
    case 'estilo':
      return s.estilos.length > 0;
    case 'equipo':
      // Puede seguir sin equipos (entrenamiento en muro solo).
      return true;
    case 'salud':
      return s.edad !== null && s.dolorHoy !== null && s.energia !== null;
    case 'resumen':
      return true;
  }
}
