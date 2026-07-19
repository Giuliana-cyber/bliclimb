/**
 * Step 4 · Estilo y objetivos.
 * Traducción de carpeta_3/onboarding_estilo_y_objetivos.
 * Multi-select de estilos + objetivo libre + stepper sesiones/semana.
 */

'use client';

import type { Estilo, OnboardingState } from '../types';
import { ChipButton } from './ChipButton';

const ESTILOS: Array<{ id: Estilo; label: string }> = [
  { id: 'regletas', label: 'Regletas' },
  { id: 'romas', label: 'Romas' },
  { id: 'desplome', label: 'Desplome' },
  { id: 'placa', label: 'Placa' },
  { id: 'chorreras', label: 'Chorreras' },
  { id: 'fisuras', label: 'Fisuras' },
];

export interface EstiloStepProps {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
}

export function EstiloStep({ state, update }: EstiloStepProps) {
  const toggleEstilo = (id: Estilo) => {
    const has = state.estilos.includes(id);
    update({
      estilos: has
        ? state.estilos.filter((e) => e !== id)
        : [...state.estilos, id],
    });
  };

  const setSesiones = (n: number) => {
    update({ sesionesSemana: Math.min(7, Math.max(1, n)) });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
        Ahora lo bueno
      </h2>

      {/* Estilos */}
      <section>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
          Tus estilos favoritos
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ESTILOS.map((e) => (
            <ChipButton
              key={e.id}
              active={state.estilos.includes(e.id)}
              onClick={() => toggleEstilo(e.id)}
            >
              {e.label}
            </ChipButton>
          ))}
        </div>
      </section>

      {/* Objetivo */}
      <section>
        <label htmlFor="objetivo" className="block">
          <span className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
            Tu objetivo
          </span>
          <input
            id="objetivo"
            type="text"
            value={state.objetivo}
            onChange={(e) => update({ objetivo: e.target.value })}
            placeholder="Ej: encadenar mi primer 5.11"
            className="mt-2 w-full h-12 px-4 rounded-full bg-white border-2 border-bil-ink/15 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none"
          />
        </label>
      </section>

      {/* Frecuencia */}
      <section className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5">
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
          Sesiones por semana
        </p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSesiones(state.sesionesSemana - 1)}
            disabled={state.sesionesSemana <= 1}
            className="w-12 h-12 rounded-full bg-bil-cream border-2 border-bil-ink/15 flex items-center justify-center text-bil-ink hover:border-bil-green disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Menos sesiones"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <div className="text-center">
            <div className="text-display-lg text-bil-green font-bold leading-none">
              {state.sesionesSemana}
            </div>
            <div className="text-label-md text-bil-ink/60 mt-1">
              {state.sesionesSemana === 1 ? 'sesión' : 'sesiones'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSesiones(state.sesionesSemana + 1)}
            disabled={state.sesionesSemana >= 7}
            className="w-12 h-12 rounded-full bg-bil-cream border-2 border-bil-ink/15 flex items-center justify-center text-bil-ink hover:border-bil-green disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Más sesiones"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
        <p className="text-label-md text-bil-ink/50 mt-3 text-center">
          Recuerda: los días de descanso también cuentan.
        </p>
      </section>
    </div>
  );
}
