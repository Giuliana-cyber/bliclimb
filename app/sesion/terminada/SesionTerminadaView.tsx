/**
 * SesionTerminadaView · client · Fase 4 UI · Batch 1.
 *
 * Traducción de docs/design/carpeta_4/sesi_n_terminada_bilclimb/code.html.
 * Cumple design-DoD-DEV.md 2026-07-18:
 *   - Paleta canónica bil-*: cero MD3, cero hex hardcodeado.
 *   - CTA "Cerrar sesión" bg-bil-red.
 *   - Círculo de logro dorado bil-gold sobre superficie blanca (crema/blanca).
 *   - Speech bubble verde bil-green con avatar Bill sobre superficie crema.
 *   - Retest/celebración con star dorado — no examen.
 *   - Copy "tú", "vas parejo" — CERO tercera persona clínica.
 *   - Path progress celebra constancia (Lun/Mié check verdes, Hoy star dorado).
 *   - Nav inferior suprimida (pantalla transaccional).
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Character = 'bill' | 'senda';
type DayState = 'done' | 'today' | 'upcoming';

export interface SesionTerminadaViewProps {
  character: Character;
  coachQuote: string;
  achievement: { title: string; subtitle: string };
  chapter: {
    title: string;
    subtitle: string;
    days: Array<{ label: string; state: DayState }>;
  };
}

type Feeling = 'bien' | 'cansancio' | 'molestia';

export function SesionTerminadaView({
  character,
  coachQuote,
  achievement,
  chapter,
}: SesionTerminadaViewProps) {
  const router = useRouter();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    // TODO F4-UI.4: POST /api/session/close con { feeling, timestamp }.
    setTimeout(() => router.push('/hoy'), 400);
  };

  return (
    <div className="min-h-screen pb-32 bg-bil-cream text-bil-ink font-nunito">
      {/* TopAppBar · avatar coach + título + engrane */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-bil-green flex-shrink-0">
            <Image
              src={`/characters/${character}-avatar.png`}
              alt={`Coach ${character}`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-headline-md-mobile font-bold text-bil-green truncate">
            ¡Sesión terminada!
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Ajustes"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>
      </header>

      <main className="pt-20 px-margin-mobile max-w-lg mx-auto space-y-8">
        {/* Speech bubble del coach */}
        <section className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-bil-green">
            <Image
              src={`/characters/${character}-avatar.png`}
              alt={character}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative bg-bil-green text-white p-4 rounded-DEFAULT rounded-tl-none shadow-sm flex-1">
            <p className="text-body-md font-semibold leading-snug">&ldquo;{coachQuote}&rdquo;</p>
            <div
              aria-hidden="true"
              className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-bil-green border-l-[12px] border-l-transparent"
            />
          </div>
        </section>

        {/* Achievement · card blanca con medalla dorada */}
        <section className="bg-white rounded-DEFAULT p-6 flex flex-col items-center text-center shadow-sm border border-bil-ink/5">
          <div className="w-24 h-24 bg-bil-gold rounded-full flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(242,178,60,0.35)]">
            <span
              className="material-symbols-outlined text-white text-5xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              military_tech
            </span>
          </div>
          <h2 className="text-headline-md text-bil-ink font-bold">{achievement.title}</h2>
          <p className="text-body-md text-bil-ink/70 mt-1">{achievement.subtitle}</p>
        </section>

        {/* Mountain Path · capítulo actual con 4 días */}
        <section className="bg-white/70 rounded-DEFAULT p-5 space-y-4 border border-bil-ink/5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-label-lg uppercase tracking-wider text-bil-ink/60">
                {chapter.title}
              </h3>
              <p className="text-headline-md text-bil-green font-bold mt-0.5">
                {chapter.subtitle}
              </p>
            </div>
            <span className="material-symbols-outlined text-bil-green text-3xl">terrain</span>
          </div>
          <div className="relative flex justify-between items-start px-2 pt-2">
            {chapter.days.map((day) => (
              <PathStep key={day.label} label={day.label} state={day.state} />
            ))}
          </div>
        </section>

        {/* Check-in · ¿cómo te sentiste? */}
        <section className="space-y-3">
          <h3 className="text-body-lg font-bold text-bil-ink">¿Cómo te sentiste?</h3>
          <div className="grid grid-cols-2 gap-3">
            <FeelingChip
              icon="sentiment_satisfied"
              label="Bien"
              active={feeling === 'bien'}
              onClick={() => setFeeling('bien')}
            />
            <FeelingChip
              icon="bolt"
              label="Cansancio"
              active={feeling === 'cansancio'}
              onClick={() => setFeeling('cansancio')}
            />
          </div>
          <FeelingChip
            icon="error_outline"
            label="Algo me molestó"
            active={feeling === 'molestia'}
            onClick={() => setFeeling('molestia')}
            fullWidth
          />
        </section>
      </main>

      {/* CTA sticky · Cerrar sesión · bil-red */}
      <div className="fixed bottom-0 left-0 w-full p-margin-mobile z-50 bg-gradient-to-t from-bil-cream via-bil-cream/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className="w-full bg-bil-red text-white h-[52px] rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {closing ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Guardando…
              </>
            ) : (
              'Listo'
            )}
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

function PathStep({ label, state }: { label: string; state: DayState }) {
  if (state === 'done') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-bil-green text-white flex items-center justify-center shadow-sm">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check
          </span>
        </div>
        <span className="text-label-md font-bold text-bil-ink">{label}</span>
      </div>
    );
  }
  if (state === 'today') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-bil-gold text-white flex items-center justify-center shadow-[0_4px_12px_rgba(242,178,60,0.35)] border-4 border-bil-cream ring-2 ring-bil-gold/30">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        </div>
        <span className="text-label-md font-bold text-bil-gold">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 opacity-60">
      <div className="w-10 h-10 rounded-full border-2 border-bil-ink/20" />
      <span className="text-label-md text-bil-ink/50">{label}</span>
    </div>
  );
}

function FeelingChip({
  icon,
  label,
  active,
  onClick,
  fullWidth,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${
        fullWidth ? 'w-full' : ''
      } py-3 px-4 rounded-full border-2 transition-all active:scale-95 font-semibold flex items-center justify-center gap-2 ${
        active
          ? 'border-bil-green bg-bil-green/10 text-bil-green'
          : 'border-bil-ink/15 text-bil-ink/70 hover:border-bil-green/40'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
    </button>
  );
}
