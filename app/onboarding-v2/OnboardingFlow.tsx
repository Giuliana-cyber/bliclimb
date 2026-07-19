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
  grado: 'Cuéntame de tu escalada — la de ahora, no la de tus mejores tiempos.',
  dedos: 'Sin examen. Solo para no pedirte de más ni de menos.',
  estilo: 'Ahora lo bueno. ¿Qué escalas y qué te gustaría lograr?',
  equipo: 'Última: tu equipo. Con lo que tengas, armamos algo bueno.',
  salud: 'Antes de arrancar, unas preguntas rápidas para cuidarte.',
  resumen: 'Esto es lo que sé de ti. Lo demás lo descubrimos juntos.',
};

const CTA_LABELS: Record<StepId, string> = {
  coach: 'Siguiente',
  grado: 'Siguiente',
  dedos: 'Siguiente',
  estilo: 'Siguiente',
  equipo: 'Siguiente',
  salud: 'Ver mi perfil',
  resumen: 'Ver mi plan',
};

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>('coach');
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  const update = (partial: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...partial }));
  };

  const currentIndex = STEP_ORDER.indexOf(step);

  const canProceed = useMemo(() => canProceedFor(step, state), [step, state]);

  const handleNext = () => {
    if (step === 'resumen') {
      // TODO F4-UI backend: POST /api/onboarding con state → guarda profile
      //  en Supabase, luego redirige a /hoy.
      router.push('/hoy');
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

  return (
    <OnboardingShell
      stepId={step}
      character={activeCharacter}
      coachQuote={COACH_QUOTES[step]}
      ctaLabel={CTA_LABELS[step]}
      ctaDisabled={!canProceed}
      onCta={handleNext}
      onBack={currentIndex > 0 ? handleBack : undefined}
    >
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
