/**
 * OnboardingShell · client · Batch 2.
 *
 * Wrapper visual reusado por cada step:
 *   - TopAppBar: brand mark + progress dots + skip/settings
 *   - Burbuja coach: sticker Bill/Senda + quote intro por step
 *   - Slot children para el contenido del step
 *   - CTA sticky bottom (bg-bil-red)
 *
 * DoD (Giuliana 2026-07-18):
 *   - bg-bil-cream · avatar sobre crema · CTA bil-red único
 *   - Botón 52px rounded-full · voz "tú" · nav inferior suprimida (transaccional)
 *   - Progress dots celebra avance, no examen.
 */

'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Character, StepId } from './types';
import { STEP_ORDER } from './types';

export interface OnboardingShellProps {
  stepId: StepId;
  character: Character;
  coachQuote: string;
  children: ReactNode;
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta: () => void;
  onBack?: () => void;
  showCoachBubble?: boolean;
}

export function OnboardingShell({
  stepId,
  character,
  coachQuote,
  children,
  ctaLabel,
  ctaDisabled = false,
  onCta,
  onBack,
  showCoachBubble = true,
}: OnboardingShellProps) {
  const currentIndex = STEP_ORDER.indexOf(stepId);

  return (
    <div className="min-h-screen pb-32 bg-bil-cream text-bil-ink font-nunito">
      {/* TopAppBar · brand mark + progress dots + back/skip */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          aria-label="Volver"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              aria-hidden="true"
              className={
                i === currentIndex
                  ? 'w-2.5 h-2.5 rounded-full bg-bil-green'
                  : i < currentIndex
                    ? 'w-2 h-2 rounded-full bg-bil-green/50'
                    : 'w-2 h-2 rounded-full bg-bil-ink/15'
              }
            />
          ))}
        </div>

        <Link
          href="/hoy"
          aria-label="Saltar"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors text-label-md font-bold"
        >
          Saltar
        </Link>
      </header>

      <main className="pt-20 px-margin-mobile max-w-lg mx-auto space-y-6">
        {/* Burbuja del coach */}
        {showCoachBubble && (
          <section className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-bil-green">
              <Image
                src={`/characters/${character}-avatar.png`}
                alt={`Coach ${character}`}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative bg-white p-4 rounded-DEFAULT rounded-tl-none shadow-sm border border-bil-ink/5 flex-1">
              <p className="text-body-md leading-snug italic text-bil-ink/85">
                &ldquo;{coachQuote}&rdquo;
              </p>
              <div
                aria-hidden="true"
                className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-white border-l-[12px] border-l-transparent"
              />
            </div>
          </section>
        )}

        <section className="space-y-6">{children}</section>
      </main>

      {/* CTA sticky · bil-red · h-[52px] · rounded-full */}
      <div className="fixed bottom-0 left-0 w-full p-margin-mobile z-50 bg-gradient-to-t from-bil-cream via-bil-cream/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={onCta}
            disabled={ctaDisabled}
            className="w-full bg-bil-red text-white h-[52px] rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ctaLabel}
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
