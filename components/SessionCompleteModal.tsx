'use client';

// Modal de celebración tras completar una sesión.
// - Confetti CSS inline (~14 partículas, sin lib externa).
// - Avatar del personaje del usuario (Bill / Senda).
// - Mensaje aleatorio del pool del personaje, o mensaje milestone si la
//   sesión cruzó 7/14/30/100 días de racha.
// - Variante toast (más liviana) para sesiones subsecuentes en la misma
//   semana — el modal full solo aparece la primera vez por semana.
//
// Persistencia: por sesión (`bilclimb_celebrated_session_<id>` en
// localStorage) para no repetir si el usuario vuelve a la página.

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { pickCelebrationMessage, type CharacterKey } from '@/lib/celebrations/messages';

export type Variant = 'modal' | 'toast';

type Props = {
  sessionId: string;
  character: CharacterKey;
  milestone: 7 | 14 | 30 | 60 | 100 | null;
  /** Si es la primera sesión completada de la semana → modal full. */
  variant: Variant;
  onClose: () => void;
};

const CONFETTI_COLORS = ['#2DD4BF', '#F5C443', '#FFFFFF', '#7DD3FC'];

function makeConfetti(count = 14) {
  return Array.from({ length: count }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 1.8 + Math.random() * 1.2;
    const rotate = Math.random() * 360;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return { i, left, delay, duration, rotate, color };
  });
}

function getCelebratedKey(sessionId: string) {
  return `bilclimb_celebrated_session_${sessionId}`;
}

export function wasSessionCelebrated(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getCelebratedKey(sessionId)) === '1';
  } catch {
    return false;
  }
}

export function markSessionCelebrated(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getCelebratedKey(sessionId), '1');
  } catch {
    // ignore
  }
}

export function SessionCompleteModal({ sessionId, character, milestone, variant, onClose }: Props) {
  const confetti = useMemo(() => makeConfetti(variant === 'modal' ? 14 : 6), [variant]);
  const [closing, setClosing] = useState(false);

  const message = useMemo(
    () => pickCelebrationMessage({ character, milestone, seed: sessionId }),
    [character, milestone, sessionId]
  );

  // Para toast: auto-cierre tras 3.5s.
  useEffect(() => {
    if (variant !== 'toast') return;
    const t = window.setTimeout(() => {
      setClosing(true);
      window.setTimeout(() => onClose(), 200);
    }, 3500);
    return () => window.clearTimeout(t);
  }, [variant, onClose]);

  // ESC cierra.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Estilos para los keyframes del confetti — inyectados una sola vez.
  const confettiStyle = (
    <style>{`
      @keyframes bilclimb-confetti-fall {
        0% { transform: translate3d(0, -40px, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(0, 110vh, 0) rotate(720deg); opacity: 0; }
      }
      .bilclimb-confetti {
        position: absolute;
        top: 0;
        width: 8px;
        height: 14px;
        border-radius: 2px;
        animation-name: bilclimb-confetti-fall;
        animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
        animation-fill-mode: forwards;
        pointer-events: none;
      }
    `}</style>
  );

  if (variant === 'toast') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-auto max-w-md transition-opacity duration-200 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {confettiStyle}
        {/* Toast no usa confetti animado para no robar atención — solo
            avatar mini + mensaje. */}
        <div className="flex items-start gap-3 rounded-2xl border border-brand-cyan/30 bg-brand-dark/95 p-3 shadow-glow backdrop-blur-xl">
          <CharacterAvatar character={character} variant="avatar" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-brand-cyan">Sesión completada</p>
            <p className="mt-0.5 text-sm font-bold leading-5 text-white">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-7 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 hover:bg-white/[0.06]"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // Modal full
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-complete-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      {confettiStyle}
      {/* Confetti */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.i}
            className="bilclimb-confetti"
            style={{
              left: `${c.left}%`,
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              transform: `rotate(${c.rotate}deg)`
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-brand-cyan/30 bg-brand-dark/95 p-6 text-center shadow-[0_0_60px_rgba(45,212,191,0.18)]">
        <div className="mx-auto mb-4 flex justify-center">
          <CharacterAvatar character={character} variant="avatar" size="xl" />
        </div>
        {milestone ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-mustard">
            {milestone} días de racha
          </p>
        ) : (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-cyan">
            Sesión completada
          </p>
        )}
        <h2 id="session-complete-title" className="mt-3 text-2xl font-extrabold leading-tight text-white">
          {message}
        </h2>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-cyan px-5 py-3 text-sm font-extrabold text-brand-dark transition hover:brightness-110"
          autoFocus
        >
          Siguiente
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
