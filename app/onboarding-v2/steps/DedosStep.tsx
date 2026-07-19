/**
 * Step 3 · Dedos y base.
 * Traducción de carpeta_3/onboarding_dedos_y_base.
 * Sin examen — solo para no pedir de más ni de menos. Copy DoD.
 */

'use client';

import type { OnboardingState } from '../types';
import { ChipButton } from './ChipButton';

export interface DedosStepProps {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
}

export function DedosStep({ state, update }: DedosStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
        Tu base actual
      </h2>

      {/* Colgado 25mm */}
      <section className="bg-white rounded-DEFAULT p-5 space-y-3 border border-bil-ink/5">
        <label className="block">
          <span className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
            Colgado en regleta 25mm
          </span>
          <div className="mt-2 relative">
            <input
              type="number"
              min={0}
              max={120}
              value={state.hangSeconds ?? ''}
              onChange={(e) =>
                update({
                  hangSeconds: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="Segundos"
              className="w-full h-12 pl-4 pr-16 rounded-full bg-bil-cream border-2 border-bil-ink/10 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-bil-ink/50 text-sm font-bold">
              seg
            </span>
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ChipButton
            active={state.hangSeconds === -1}
            onClick={() => update({ hangSeconds: -1 })}
          >
            No sé
          </ChipButton>
          <ChipButton
            active={state.hangSeconds === -2}
            onClick={() => update({ hangSeconds: -2 })}
            icon="timer"
          >
            Guíame 2 min
          </ChipButton>
        </div>
      </section>

      {/* Dominadas */}
      <section className="bg-white rounded-DEFAULT p-5 space-y-3 border border-bil-ink/5">
        <label className="block">
          <span className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
            Dominadas máximas
          </span>
          <div className="mt-2 relative">
            <input
              type="number"
              min={0}
              max={50}
              value={state.pullups ?? ''}
              onChange={(e) =>
                update({
                  pullups: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="Reps"
              className="w-full h-12 pl-4 pr-16 rounded-full bg-bil-cream border-2 border-bil-ink/10 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-bil-ink/50 text-sm font-bold">
              reps
            </span>
          </div>
        </label>
        <div>
          <ChipButton
            fullWidth
            active={state.pullups === -1}
            onClick={() => update({ pullups: -1 })}
          >
            No sé
          </ChipButton>
        </div>
      </section>

      {/* Lesión activa */}
      <section className="bg-white rounded-DEFAULT p-5 space-y-3 border border-bil-ink/5">
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
          ¿Tienes alguna lesión activa?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ChipButton
            active={!state.hasInjury}
            onClick={() => update({ hasInjury: false, injuryZone: '' })}
          >
            No
          </ChipButton>
          <ChipButton
            active={state.hasInjury}
            onClick={() => update({ hasInjury: true })}
            tone="red"
          >
            Sí
          </ChipButton>
        </div>
        {state.hasInjury && (
          <input
            type="text"
            value={state.injuryZone}
            onChange={(e) => update({ injuryZone: e.target.value })}
            placeholder="¿En qué zona? (ej. hombro derecho)"
            className="w-full h-12 px-4 rounded-full bg-bil-cream border-2 border-bil-ink/10 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none"
          />
        )}
      </section>
    </div>
  );
}
