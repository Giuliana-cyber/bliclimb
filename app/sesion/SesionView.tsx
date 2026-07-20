/**
 * SesionView · client · Fase 4 UI · Batch 1.
 *
 * Traducción de docs/design/carpeta_3/sesi_n_bilclimb/code.html.
 * Cumple design-DoD-DEV.md 2026-07-18:
 *   - Paleta canónica bil-*: cero MD3, cero hex hardcodeado.
 *   - CTA primario "Siguiente ejercicio" con bg-bil-red.
 *   - Pro-tip callout con border-bil-gold + text-bil-gold.
 *   - Errores comunes con text-bil-red.
 *   - Avatar Bill sobre superficie crema (top bar).
 *   - Copy "tú", sin jerga del motor (renombramos internal "phase"/"category").
 *   - Nav inferior suprimida — pantalla transaccional; regreso vía top bar.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { AssembledSession } from '@/lib/brain/motor-inverted/assembler';

export interface SesionViewProps {
  session: AssembledSession | null;
  character: 'bill' | 'senda';
  currentIndex: number;
  restSeconds: number;
  error: string | null;
  focusRule?: string | null;
}

const SESSION_HEADLINE = 'Bloque de Fuerza';

export function SesionView({ session, character, currentIndex, restSeconds, error }: SesionViewProps) {
  // focusRule prop reservada para debug — SesionView actual no la muestra.
  const router = useRouter();
  const exercises = session?.exercises ?? [];
  const total = exercises.length;
  const current = exercises[currentIndex];
  const upcoming = exercises.slice(currentIndex + 1);

  // El catálogo trae `execution` como prosa. Para el pro-tip de técnica lo
  // partimos por punto/salto para armar bullets legibles (máx 3). Si no
  // aporta, ocultamos el callout.
  const proTips = current
    ? current.execution
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim().replace(/[.!?]+$/, ''))
        .filter((s) => s.length > 6)
        .slice(0, 3)
    : [];

  const [seconds, setSeconds] = useState(restSeconds);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const timerText = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const timerCircumference = 276;
  const timerOffset = timerCircumference * (1 - seconds / Math.max(restSeconds, 1));

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      router.push('/sesion/terminada');
    } else {
      // TODO F4-UI.4: siguiente ejercicio + cache de progreso en Supabase.
      router.push('/sesion/terminada');
    }
  };

  return (
    <div className="min-h-screen pb-32 bg-bil-cream text-bil-ink font-nunito">
      {/* TopAppBar · avatar coach + título sesión + engrane */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full">
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
          <h1 className="text-headline-md-mobile font-bold text-bil-green truncate">
            Movilidad y Dedos Suaves
          </h1>
        </div>
        <Link
          href="/hoy"
          aria-label="Volver"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>
      </header>

      {/* Semáforo seguridad · sticky bajo el header, siempre visible.
          Cae en la banda 48-108px del viewport, bg-bil-cream para tapar
          scroll detrás. Tappable como cualquier CTA, no bloquea foco. */}
      <div className="fixed top-touch-target left-0 right-0 z-40 bg-bil-cream px-margin-mobile pt-3 pb-3">
        <div className="max-w-lg mx-auto">
          <Link
            href="/dolor"
            className="w-full bg-bil-red/10 text-bil-red flex items-center justify-center gap-3 py-3 px-4 rounded-full active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
            <span className="font-bold text-sm text-center">
              ¿Algo te duele hoy? Toca aquí y ajustamos
            </span>
          </Link>
        </div>
      </div>

      <main className="pt-36 px-margin-mobile max-w-lg mx-auto">
        {/* Header sesión · progreso 2/5 */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-label-md text-bil-ink/60 uppercase tracking-wider mb-1">
              En progreso
            </p>
            <h2 className="text-headline-lg-mobile text-bil-ink">{SESSION_HEADLINE}</h2>
          </div>
          <div className="text-right">
            <span className="text-display-lg text-bil-green leading-none">
              {currentIndex + 1}
              <span className="text-bil-ink/50 text-headline-md">/{total || '·'}</span>
            </span>
          </div>
        </div>

        {error ? (
          <div className="bg-bil-red/10 text-bil-red rounded-DEFAULT p-4 text-sm">
            No pude armar tu sesión. {error}
          </div>
        ) : !current ? (
          <div className="bg-white/60 rounded-DEFAULT p-6 text-center text-bil-ink/60">
            Preparando tus ejercicios…
          </div>
        ) : (
          <>
            {/* Ejercicio actual · expanded */}
            <article className="bg-white rounded-lg p-card-padding border border-bil-ink/10 shadow-sm">
              <header className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-bil-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Actual
                    </span>
                    <RiskChip level={current.riskLevel} />
                  </div>
                  <h3 className="text-headline-md text-bil-ink leading-tight">
                    {current.name}
                  </h3>
                </div>
                <span className="material-symbols-outlined text-bil-green">expand_less</span>
              </header>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <MetricTile
                  label="Protocolo"
                  value={`${current.sets} × ${current.reps}`}
                />
                <MetricTile label="Descanso" value={current.rest || '—'} />
              </div>

              <div className="space-y-6 border-t border-bil-ink/10 pt-6">
                {session?.rationale && (
                  <section>
                    <h4 className="flex items-center gap-2 font-bold text-sm text-bil-green mb-2">
                      <span className="material-symbols-outlined text-[18px]">psychology</span>
                      ¿Por qué?
                    </h4>
                    <p className="text-body-md text-bil-ink/75">{session.rationale}</p>
                  </section>
                )}

                {proTips.length > 0 && (
                  <section className="bg-bil-cream p-4 rounded-DEFAULT border-l-4 border-bil-gold">
                    <h4 className="flex items-center gap-2 font-bold text-sm text-bil-gold mb-2">
                      <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                      Pro-tip: Técnica
                    </h4>
                    <ul className="list-disc list-inside text-body-md text-bil-ink/80 space-y-1">
                      {proTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {current.stopSignals && (
                  <section>
                    <h4 className="flex items-center gap-2 font-bold text-sm text-bil-red mb-2">
                      <span className="material-symbols-outlined text-[18px]">report</span>
                      Cuándo parar
                    </h4>
                    <p className="text-body-md text-bil-ink/75">{current.stopSignals}</p>
                  </section>
                )}

                <button
                  type="button"
                  className="w-full h-[52px] rounded-full border-2 border-bil-green text-bil-green font-bold text-sm active:scale-95 transition-transform"
                >
                  ¿Hoy no sale? Prueba la versión asistida
                </button>
              </div>
            </article>

            {/* Ejercicios en cola · locked */}
            <div className="mt-4 space-y-3">
              {upcoming.map((ex, i) => (
                <div
                  key={ex.exerciseId}
                  className="bg-bil-cream border border-bil-ink/10 rounded-lg px-4 py-4 flex justify-between items-center opacity-70"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full border-2 border-bil-ink/20 flex items-center justify-center font-bold text-bil-ink/40 flex-shrink-0">
                      {currentIndex + 2 + i}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-bil-ink truncate">{ex.name}</h4>
                      <p className="text-label-md text-bil-ink/60 truncate">
                        {ex.sets} × {ex.reps}
                        {ex.rest ? ` · Descanso ${ex.rest}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-bil-ink/30 flex-shrink-0">
                    lock
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Timer descanso circular · OCULTO hasta que exista state real
          de "descansando" (F4-UI backend). Regla Giuliana 2026-07-18:
          no mostrar UI que no funciona. El componente sigue vivo abajo
          para conectarlo cuando el state esté listo — buscar "resting". */}
      {false && current && (
        <div className="fixed bottom-24 right-margin-mobile z-40">
          <div className="relative w-20 h-20 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg border-2 border-bil-green">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90" width="80" height="80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                strokeWidth="3"
                className="stroke-bil-ink/10"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                strokeWidth="3"
                strokeDasharray={timerCircumference}
                strokeDashoffset={timerOffset}
                strokeLinecap="round"
                className="stroke-bil-green transition-all duration-1000"
              />
            </svg>
            <div className="text-center z-10">
              <p className="text-[9px] font-bold text-bil-green uppercase leading-none">
                Descanso
              </p>
              <p className="font-bold text-[16px] text-bil-ink leading-tight mt-0.5">
                {timerText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA sticky · Siguiente ejercicio · bil-red */}
      <div className="fixed bottom-0 left-0 w-full p-margin-mobile z-50 bg-gradient-to-t from-bil-cream via-bil-cream/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleNext}
            disabled={!current}
            className="w-full bg-bil-red text-white h-[52px] rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente ejercicio
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

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
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3 rounded-DEFAULT border border-bil-ink/10">
      <p className="text-label-md text-bil-ink/60">{label}</p>
      <p className="font-bold text-sm text-bil-ink mt-0.5">{value}</p>
    </div>
  );
}

function RiskChip({ level }: { level: string | null | undefined }) {
  // Semáforo cálido según DoD (Giuliana 2026-07-19):
  //   low, low-medium   → "OK"       verde (bil-green)
  //   medium            → "Ojo"      ámbar (bil-gold)
  //   medium-high, high → "Cuidado"  rojo  (bil-red)
  // El oro es SOLO para logro/pro-tip · nunca para "riesgo bajo".
  if (!level) return null;
  const norm = level.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    low: { label: 'OK', cls: 'bg-bil-green/15 text-bil-green' },
    'low-medium': { label: 'OK', cls: 'bg-bil-green/15 text-bil-green' },
    medium: { label: 'Ojo', cls: 'bg-bil-gold/20 text-bil-gold' },
    'medium-high': { label: 'Cuidado', cls: 'bg-bil-red/10 text-bil-red' },
    high: { label: 'Cuidado', cls: 'bg-bil-red/10 text-bil-red' },
  };
  const preset = map[norm] ?? { label: 'Ojo', cls: 'bg-bil-gold/20 text-bil-gold' };
  return (
    <span
      className={`${preset.cls} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide`}
    >
      {preset.label}
    </span>
  );
}
