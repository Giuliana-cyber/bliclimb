/**
 * Step 5 · Equipamiento.
 * Traducción de carpeta_3/onboarding_equipamiento.
 * Multi-select con iconos. Checkbox "Pronto tendré más equipo".
 */

'use client';

import type { Equipo, OnboardingState } from '../types';
import { ChipButton } from './ChipButton';

const EQUIPOS: Array<{ id: Equipo; label: string; icon: string }> = [
  { id: 'pesas', label: 'Pesas', icon: 'fitness_center' },
  { id: 'bandas', label: 'Bandas', icon: 'rebase' },
  { id: 'barra-dominadas', label: 'Barra dominadas', icon: 'horizontal_rule' },
  { id: 'campus', label: 'Campus', icon: 'grid_view' },
  { id: 'hangboard', label: 'Hangboard', icon: 'legend_toggle' },
  { id: 'trx', label: 'TRX', icon: 'all_inclusive' },
];

export interface EquipoStepProps {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
}

export function EquipoStep({ state, update }: EquipoStepProps) {
  const toggle = (id: Equipo) => {
    const has = state.equipos.includes(id);
    update({
      equipos: has
        ? state.equipos.filter((e) => e !== id)
        : [...state.equipos, id],
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
        Tu equipo disponible
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {EQUIPOS.map((e) => (
          <ChipButton
            key={e.id}
            active={state.equipos.includes(e.id)}
            onClick={() => toggle(e.id)}
            icon={e.icon}
          >
            {e.label}
          </ChipButton>
        ))}
      </div>

      <label className="flex items-center gap-3 cursor-pointer bg-white rounded-DEFAULT p-4 border border-bil-ink/5 active:scale-[0.99] transition-transform">
        <input
          type="checkbox"
          checked={state.masEquipoPronto}
          onChange={(e) => update({ masEquipoPronto: e.target.checked })}
          className="w-5 h-5 accent-bil-green"
        />
        <span className="text-body-md text-bil-ink/80">
          Pronto tendré más equipo
        </span>
      </label>

      <p className="text-label-md text-bil-ink/50 text-center px-4">
        Podrás cambiar tu equipo en cualquier momento desde tu perfil.
      </p>
    </div>
  );
}
