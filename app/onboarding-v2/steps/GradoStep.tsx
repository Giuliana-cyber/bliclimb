/**
 * Step 2 · Grado actual.
 * Corrección global #3 (Giuliana): toggle Boulder/Ruta que CAMBIA
 * los chips (V-scale vs YDS). "No sé" siempre disponible.
 * Basado en carpeta_3/onboarding_grado_actual_boulder_ruta_2 (versión rica).
 */

'use client';

import type { EstadoActual, GradoDisciplina, OnboardingState } from '../types';
import { ChipButton } from './ChipButton';

const CHIPS_BOULDER = [
  { id: 'v0-v3', label: 'V0 – V3' },
  { id: 'v4-v6', label: 'V4 – V6' },
  { id: 'v7+', label: 'V7+' },
];

const CHIPS_RUTA = [
  { id: '5.9-menos', label: '5.9 o menos' },
  { id: '5.10', label: '5.10' },
  { id: '5.11', label: '5.11' },
  { id: '5.12+', label: '5.12+' },
];

const ESTADOS: Array<{ id: EstadoActual; label: string; icon: string }> = [
  { id: 'activo', label: 'Activo', icon: 'fitness_center' },
  { id: 'volviendo-paron', label: 'Volviendo de parón', icon: 'pause_circle' },
  { id: 'volviendo-lesion', label: 'Volviendo de lesión', icon: 'healing' },
  { id: 'empezando', label: 'Empezando', icon: 'cruelty_free' },
];

export interface GradoStepProps {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
}

export function GradoStep({ state, update }: GradoStepProps) {
  const chips =
    state.disciplina === 'boulder' ? CHIPS_BOULDER
    : state.disciplina === 'ruta' ? CHIPS_RUTA
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
        ¿Dónde estás parado hoy?
      </h2>

      {/* Toggle Boulder / Ruta / No sé · segmentado 3-way */}
      <div className="bg-white p-1 rounded-full border border-bil-ink/10 flex">
        <DisciplinaTab
          active={state.disciplina === 'boulder'}
          onClick={() =>
            update({ disciplina: 'boulder', grado: null })
          }
        >
          Boulder
        </DisciplinaTab>
        <DisciplinaTab
          active={state.disciplina === 'ruta'}
          onClick={() =>
            update({ disciplina: 'ruta', grado: null })
          }
        >
          Ruta
        </DisciplinaTab>
        <DisciplinaTab
          active={state.disciplina === 'no-se'}
          onClick={() =>
            // Al elegir "No sé" seteamos grado='no-se' automáticamente
            // para que canProceed pase — la duda ya es una respuesta.
            update({ disciplina: 'no-se', grado: 'no-se' })
          }
        >
          No sé
        </DisciplinaTab>
      </div>

      {/* Grado · chips que cambian (o mensaje cálido si "No sé") */}
      {state.disciplina === 'no-se' ? (
        <div className="bg-bil-cream border-l-4 border-bil-green p-4 rounded-DEFAULT">
          <p className="text-body-md text-bil-ink/85">
            No hace falta que lo sepas todavía. Te guiamos las primeras
            semanas y descubrimos tu grado real juntos.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
            Tu nivel habitual
          </p>
          <div className="grid grid-cols-2 gap-3">
            {chips.map((chip) => (
              <ChipButton
                key={chip.id}
                active={state.grado === chip.id}
                onClick={() => update({ grado: chip.id })}
              >
                {chip.label}
              </ChipButton>
            ))}
          </div>
        </div>
      )}

      {/* Estado actual */}
      <div>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
          ¿Cómo llegas hoy?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ESTADOS.map((e) => (
            <ChipButton
              key={e.id}
              active={state.estadoActual === e.id}
              onClick={() => update({ estadoActual: e.id })}
              icon={e.icon}
            >
              {e.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Techo histórico (opcional) */}
      <div>
        <label
          htmlFor="techo"
          className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-2 block"
        >
          Techo histórico (opcional)
        </label>
        <input
          id="techo"
          type="text"
          value={state.techoHistorico}
          onChange={(e) => update({ techoHistorico: e.target.value })}
          placeholder="Mi mejor grado fue…"
          className="w-full h-12 px-4 rounded-full bg-white border-2 border-bil-ink/15 text-bil-ink placeholder:text-bil-ink/40 focus:border-bil-green focus:outline-none"
        />
        <p className="text-label-md text-bil-ink/50 mt-2 px-2">
          Solo si sientes que es relevante para tu plan.
        </p>
      </div>
    </div>
  );
}

function DisciplinaTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-10 rounded-full font-bold text-sm transition-all ${
        active ? 'bg-bil-green text-white shadow-sm' : 'text-bil-ink/60'
      }`}
    >
      {children}
    </button>
  );
}
