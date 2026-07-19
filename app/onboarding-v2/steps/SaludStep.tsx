/**
 * Step 6 · Seguridad y salud.
 * Traducción de carpeta_4/onboarding_seguridad_y_salud.
 * Semáforo cálido (OK / Ojo / Cuidado) según DoD.
 * Card "Este dato es solo para Bill y Senda" (privacidad energía).
 */

'use client';

import type {
  DolorHoy,
  Edad,
  Embarazo,
  Energia,
  OnboardingState,
  Zona,
} from '../types';
import { computeSemaforo } from '../types';
import { ChipButton } from './ChipButton';

const EDADES: Array<{ id: Edad; label: string }> = [
  { id: 'menor-16', label: 'Menor de 16' },
  { id: '16-35', label: '16-35' },
  { id: '36-50', label: '36-50' },
  { id: 'mas-50', label: 'Más de 50' },
];

const ZONAS: Array<{ id: Zona; label: string }> = [
  { id: 'dedos', label: 'Dedos' },
  { id: 'codos', label: 'Codos' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'espalda', label: 'Espalda' },
];

const DOLOR: Array<{ id: DolorHoy; label: string; icon: string; tone: 'green' | 'gold' | 'red' }> = [
  { id: 'nada', label: 'Nada', icon: 'sentiment_satisfied', tone: 'green' },
  { id: 'molestia', label: 'Molestia', icon: 'sentiment_neutral', tone: 'gold' },
  { id: 'dolor', label: 'Dolor', icon: 'sentiment_dissatisfied', tone: 'red' },
];

const ENERGIA: Array<{ id: Energia; label: string; icon: string }> = [
  { id: 'a-tope', label: 'A tope', icon: 'bolt' },
  { id: 'normal', label: 'Normal', icon: 'sentiment_satisfied' },
  { id: 'cansancio', label: 'Cansancio', icon: 'battery_2_bar' },
];

export interface SaludStepProps {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
}

export function SaludStep({ state, update }: SaludStepProps) {
  const toggleZona = (id: Zona) => {
    const has = state.zonasLesion.includes(id);
    update({
      zonasLesion: has
        ? state.zonasLesion.filter((z) => z !== id)
        : [...state.zonasLesion, id],
    });
  };

  const semaforo = computeSemaforo(state);

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
        Cuidémonos hoy
      </h2>

      {/* Edad */}
      <section>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
          ¿Cuántos años tienes?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {EDADES.map((e) => (
            <ChipButton
              key={e.id}
              active={state.edad === e.id}
              onClick={() => update({ edad: e.id })}
            >
              {e.label}
            </ChipButton>
          ))}
        </div>
      </section>

      {/* Lesión activa */}
      <section>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
          ¿Alguna lesión activa?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ChipButton
            active={!state.hasActiveLesion}
            onClick={() =>
              update({ hasActiveLesion: false, zonasLesion: [] })
            }
          >
            No
          </ChipButton>
          <ChipButton
            active={state.hasActiveLesion}
            onClick={() => update({ hasActiveLesion: true })}
            tone="red"
          >
            Sí
          </ChipButton>
        </div>
        {state.hasActiveLesion && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {ZONAS.map((z) => (
              <ChipButton
                key={z.id}
                active={state.zonasLesion.includes(z.id)}
                onClick={() => toggleZona(z.id)}
                tone="red"
              >
                {z.label}
              </ChipButton>
            ))}
          </div>
        )}
      </section>

      {/* Dolor hoy */}
      <section>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
          ¿Sientes dolor hoy al escalar?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DOLOR.map((d) => (
            <ChipButton
              key={d.id}
              active={state.dolorHoy === d.id}
              onClick={() => update({ dolorHoy: d.id })}
              icon={d.icon}
              tone={d.tone}
            >
              {d.label}
            </ChipButton>
          ))}
        </div>
      </section>

      {/* Embarazo */}
      <section>
        <label className="block">
          <span className="text-label-lg uppercase tracking-wider text-bil-ink/60 font-bold">
            Embarazo o posparto
          </span>
          <select
            value={state.embarazo}
            onChange={(e) =>
              update({ embarazo: e.target.value as Embarazo })
            }
            className="mt-2 w-full h-12 px-4 rounded-full bg-white border-2 border-bil-ink/15 text-bil-ink focus:border-bil-green focus:outline-none appearance-none"
          >
            <option value="no-aplica">No aplica</option>
            <option value="si">Sí</option>
          </select>
        </label>
      </section>

      {/* Energía · con label de privacidad */}
      <section>
        <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          ¿Cómo vas de energía hoy?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {ENERGIA.map((e) => (
            <ChipButton
              key={e.id}
              active={state.energia === e.id}
              onClick={() => update({ energia: e.id })}
              icon={e.icon}
            >
              {e.label}
            </ChipButton>
          ))}
        </div>
        <p className="text-label-md text-bil-ink/50 mt-2 italic">
          Solo Bill y Senda leen esto. Nadie más.
        </p>
      </section>

      {/* Semáforo cálido resultado */}
      {state.dolorHoy && (
        <SemaforoCard semaforo={semaforo} />
      )}
    </div>
  );
}

function SemaforoCard({ semaforo }: { semaforo: 'ok' | 'ojo' | 'cuidado' }) {
  const preset = {
    ok: {
      label: 'OK',
      copy: 'Todo verde para entrenar hoy. Bill y Senda te van a acompañar como siempre.',
      icon: 'check_circle',
      cls: 'bg-bil-green/10 border-bil-green text-bil-green',
    },
    ojo: {
      label: 'Ojo',
      copy: 'Ajustamos el plan de hoy para cuidar lo que sientes. Nada intenso.',
      icon: 'warning',
      cls: 'bg-bil-gold/10 border-bil-gold text-bil-gold',
    },
    cuidado: {
      label: 'Cuidado',
      copy: 'Hoy no cargamos. Priorizamos técnica y movilidad. Si algo duele, paramos.',
      icon: 'shield',
      cls: 'bg-bil-red/10 border-bil-red text-bil-red',
    },
  }[semaforo];

  return (
    <div
      className={`rounded-DEFAULT p-4 border-l-4 flex items-start gap-3 ${preset.cls}`}
    >
      <span
        className="material-symbols-outlined mt-0.5"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {preset.icon}
      </span>
      <div>
        <p className="font-bold text-sm">Semáforo de hoy: {preset.label}</p>
        <p className="text-body-md text-bil-ink/80 mt-1">{preset.copy}</p>
      </div>
    </div>
  );
}
