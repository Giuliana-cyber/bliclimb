/**
 * DolorView · client · #16.
 *
 * DoD:
 *   - tokens bil-* · sin nav inferior · voz "tú"
 *   - Semáforo cálido: 0-3 OK verde · 4-6 Ojo ámbar · 7-10 Cuidado rojo
 *   - Cero jerga médica · cero "diagnóstico"
 *   - CTA "Ajustamos la sesión" bil-red único; "Mejor descansa hoy"
 *     como secundario verde outline · mismo tamaño 52px.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Zona = 'dedos' | 'codos' | 'hombros' | 'muneca' | 'espalda' | 'cadera' | 'rodilla';

const ZONAS: Array<{ id: Zona; label: string }> = [
  { id: 'dedos', label: 'Dedos' },
  { id: 'muneca', label: 'Muñeca' },
  { id: 'codos', label: 'Codos' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'cadera', label: 'Cadera' },
  { id: 'rodilla', label: 'Rodilla' },
];

type Semaforo = { label: string; tone: 'green' | 'gold' | 'red'; copy: string };

function semaforoFor(intensidad: number): Semaforo {
  if (intensidad <= 3) {
    return {
      label: 'OK',
      tone: 'green',
      copy: 'Molestia leve. Ajustamos la carga y sigues suave.',
    };
  }
  if (intensidad <= 6) {
    return {
      label: 'Ojo',
      tone: 'gold',
      copy: 'Presta atención. Bajamos intensidad o pasamos a movilidad.',
    };
  }
  return {
    label: 'Cuidado',
    tone: 'red',
    copy: 'No forzamos hoy. Hablemos qué SÍ podemos hacer.',
  };
}

export interface DolorViewProps {
  character: 'bill' | 'senda';
}

export function DolorView({ character }: DolorViewProps) {
  const router = useRouter();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [intensidad, setIntensidad] = useState(3);
  const semaforo = semaforoFor(intensidad);
  const canProceed = zonas.length > 0;

  const toggleZona = (z: Zona) => {
    setZonas((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]));
  };

  const handleAjustar = () => {
    if (intensidad >= 7) {
      // Regla dura: cuidado → puente #17
      const params = new URLSearchParams({
        zonas: zonas.join(','),
        intensidad: String(intensidad),
      });
      router.push(`/dolor/derivacion?${params.toString()}`);
      return;
    }
    // TODO F4-UI backend: POST /api/dolor con {zonas, intensidad, action: 'adjust'}
    router.push('/sesion');
  };

  const handleDescansar = () => {
    // TODO F4-UI backend: POST /api/dolor con {zonas, intensidad, action: 'rest'}
    router.push('/hoy');
  };

  const toneCard =
    semaforo.tone === 'green'
      ? 'bg-bil-green/10 border-bil-green'
      : semaforo.tone === 'gold'
        ? 'bg-bil-gold/10 border-bil-gold'
        : 'bg-bil-red/10 border-bil-red';
  const toneText =
    semaforo.tone === 'green'
      ? 'text-bil-green'
      : semaforo.tone === 'gold'
        ? 'text-bil-gold'
        : 'text-bil-red';
  const sliderThumbColor =
    semaforo.tone === 'green' ? '#2F7D63' : semaforo.tone === 'gold' ? '#F2B23C' : '#D6463A';

  return (
    <div className="min-h-screen pb-32 bg-bil-cream text-bil-ink font-nunito">
      {/* Bottom-sheet style · drag handle arriba + X para cerrar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream border-b border-bil-ink/5">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-bil-ink/20" aria-hidden="true" />
        </div>
        <div className="flex justify-between items-center px-margin-mobile h-touch-target">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-bil-green flex-shrink-0">
              <Image
                src={`/characters/${character}-avatar.png`}
                alt={`Coach ${character === 'bill' ? 'Bill' : 'Senda'}`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-headline-md-mobile font-bold text-bil-green">
              ¿Algo te duele?
            </h1>
          </div>
          <Link
            href="/hoy"
            aria-label="Cerrar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </Link>
        </div>
      </header>

      <main className="pt-28 px-margin-mobile max-w-lg mx-auto space-y-6">
        <p className="text-body-md text-bil-ink/75 leading-snug">
          Cuéntame qué sientes y cuánto. Sin apuro. Ajustamos hoy · sin castigo.
        </p>

        {/* Zonas · chips multi-select */}
        <section>
          <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
            ¿Dónde?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ZONAS.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZona(z.id)}
                aria-pressed={zonas.includes(z.id)}
                className={`h-12 rounded-full border-2 font-semibold text-sm transition-all active:scale-95 ${
                  zonas.includes(z.id)
                    ? 'border-bil-red bg-bil-red/10 text-bil-red'
                    : 'border-bil-ink/15 text-bil-ink/70 hover:border-bil-ink/30'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </section>

        {/* Intensidad · slider 0-10 con color semáforo */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-label-lg uppercase tracking-wider text-bil-ink/60">
              ¿Cuánto?
            </p>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm ${toneCard} border-2 ${toneText}`}
            >
              {semaforo.label} · {intensidad}
            </span>
          </div>
          <div className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={intensidad}
              onChange={(e) => setIntensidad(Number(e.target.value))}
              aria-label="Intensidad del dolor 0 a 10"
              className="w-full h-3 rounded-full appearance-none cursor-pointer accent-bil-green"
              style={
                {
                  background: `linear-gradient(to right, ${sliderThumbColor} 0%, ${sliderThumbColor} ${intensidad * 10}%, rgba(36,31,28,0.1) ${intensidad * 10}%, rgba(36,31,28,0.1) 100%)`,
                } as React.CSSProperties
              }
            />
            <div className="flex justify-between mt-2 text-label-md text-bil-ink/50">
              <span>0 · nada</span>
              <span>5</span>
              <span>10 · fuerte</span>
            </div>
          </div>
          <p className={`text-body-md mt-3 leading-snug ${toneText}`}>{semaforo.copy}</p>
        </section>

        {/* Acciones · siempre 2 caminos · nunca limbo */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={handleAjustar}
            disabled={!canProceed}
            className="w-full h-[52px] bg-bil-red text-white rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {intensidad >= 7 ? 'Hablemos qué hacer' : 'Ajustamos la sesión'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={handleDescansar}
            disabled={!canProceed}
            className="w-full h-[52px] rounded-full border-2 border-bil-green text-bil-green font-bold text-body-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">bedtime</span>
            Mejor descansa hoy
          </button>
          <p className="text-label-md text-bil-ink/50 text-center leading-snug px-4">
            Descansar no es falla. Los días de descanso también cuentan.
          </p>
        </section>
      </main>

      <style jsx global>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        html,
        body {
          background: #f2ede3;
        }
        /* Slider thumb personalizado · círculo grande fácil de tocar */
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${sliderThumbColor};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }
        input[type='range']::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${sliderThumbColor};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
