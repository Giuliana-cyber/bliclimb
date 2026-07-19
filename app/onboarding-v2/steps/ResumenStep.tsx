/**
 * Step 7 · Resumen del perfil (Pasaporte de escalador).
 * Traducción de carpeta_4/onboarding_resumen_perfil.
 * "Lo que sé de ti" · "Lo que todavía no" · "Tu primer enfoque" (bil-gold).
 * CTA "Ver mi plan" (bil-red) — cierra el flow y redirige a /hoy.
 */

'use client';

import type { OnboardingState } from '../types';
import { computeSemaforo } from '../types';

export interface ResumenStepProps {
  state: OnboardingState;
}

const GRADO_LABEL: Record<string, string> = {
  'v0-v3': 'V0 – V3',
  'v4-v6': 'V4 – V6',
  'v7+': 'V7+',
  '5.9-menos': '5.9 o menos',
  '5.10': '5.10',
  '5.11': '5.11',
  '5.12+': '5.12+',
  'no-se': 'Sin definir',
};

export function ResumenStep({ state }: ResumenStepProps) {
  const gradoLabel = state.grado ? GRADO_LABEL[state.grado] : 'Sin definir';
  const semaforo = computeSemaforo(state);
  const primerFocus = pickPrimerFocus(state, semaforo);

  const knownChips: Array<{ label: string; icon: string }> = [
    { label: gradoLabel, icon: 'mountain_flag' },
    {
      label: `${state.sesionesSemana} ${state.sesionesSemana === 1 ? 'sesión' : 'sesiones'}/sem`,
      icon: 'calendar_today',
    },
  ];
  if (state.equipos.length > 0) {
    knownChips.push({
      label: state.equipos.length === 1 ? 'Básico' : `${state.equipos.length} equipos`,
      icon: 'backpack',
    });
  }

  const missing = missingSignals(state);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
          Listo. Ya te conocemos.
        </h2>
        <p className="text-body-md text-bil-ink/70 mt-2">
          Esto es lo que sé de ti, esto es lo que todavía no, y este es tu primer enfoque.
        </p>
      </div>

      {/* Card pasaporte */}
      <section className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm space-y-5">
        <header className="flex items-center gap-3 pb-3 border-b border-bil-ink/10">
          <span className="material-symbols-outlined text-bil-green text-3xl">
            id_card
          </span>
          <div>
            <p className="text-label-md text-bil-ink/60 uppercase tracking-wider">
              Tu pasaporte
            </p>
            <h3 className="text-headline-md text-bil-ink font-bold">
              De escalador
            </h3>
          </div>
        </header>

        <div>
          <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
            Lo que sé de ti
          </p>
          <div className="flex flex-wrap gap-2">
            {knownChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-2 bg-bil-green/10 text-bil-green px-3 py-2 rounded-full text-sm font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {missing.length > 0 && (
          <div className="border-l-4 border-bil-green pl-3">
            <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-1">
              Lo que todavía no
            </p>
            <ul className="text-body-md text-bil-ink/80 space-y-1">
              {missing.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-bil-green text-[16px] mt-1">
                    psychology
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-2">
            Tu primer enfoque
          </p>
          <div className="inline-flex items-center gap-2 bg-bil-gold text-white px-4 py-2 rounded-full font-bold shadow-[0_4px_12px_rgba(242,178,60,0.35)]">
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
            {primerFocus}
          </div>
        </div>
      </section>

      <p className="text-label-md text-bil-ink/50 text-center">
        by Belay Partners
      </p>
    </div>
  );
}

function missingSignals(state: OnboardingState): string[] {
  const list: string[] = [];
  if (state.hangSeconds === null || state.hangSeconds < 0) {
    list.push('Tu colgado en regleta — lo medimos en la primera sesión.');
  }
  if (state.pullups === null || state.pullups < 0) {
    list.push('Tu fuerza de dominadas — la calibramos juntos.');
  }
  if (!state.grado || state.grado === 'no-se') {
    list.push('Tu grado exacto — te guiamos las primeras semanas.');
  }
  return list;
}

function pickPrimerFocus(
  state: OnboardingState,
  semaforo: 'ok' | 'ojo' | 'cuidado',
): string {
  if (semaforo === 'cuidado') return 'Cuidar y reconstruir';
  if (state.estadoActual === 'volviendo-lesion') return 'Reconstrucción segura';
  if (state.estadoActual === 'empezando') return 'Base y técnica';
  if (state.grado === 'no-se' || (state.hangSeconds !== null && state.hangSeconds < 8)) {
    return 'Movilidad y base';
  }
  return 'Fuerza específica';
}
