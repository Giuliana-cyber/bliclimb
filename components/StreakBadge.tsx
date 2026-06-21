'use client';

// StreakBadge — muestra la racha actual del usuario en el dashboard.
// Reglas visuales (spec):
// - Número grande de días + texto "días seguidos entrenando"
// - racha ≥ 7: ícono de fuego con glow naranja
// - racha ≥ 30: glow turquesa adicional
// - racha = 0: mensaje gris "Empieza tu racha hoy"
//
// Carga inicial via /api/auth/status. Hidden mientras carga para evitar
// flicker.
import { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';

type StreakInfo = { current: number; longest: number };

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const s = (data?.streak ?? null) as StreakInfo | null;
        if (s) setStreak(s);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak) return null;

  if (streak.current === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/45">
          <Sparkles aria-hidden="true" size={20} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white/72">Empieza tu racha hoy</p>
          <p className="mt-0.5 text-xs text-white/45">
            Cada sesión o check-in cuenta como un día activo.
          </p>
        </div>
      </div>
    );
  }

  const hasFire = streak.current >= 7;
  const hasCyanGlow = streak.current >= 30;
  const containerClass = hasCyanGlow
    ? 'border-brand-cyan/40 bg-brand-cyan/[0.06] shadow-[0_0_30px_rgba(45,212,191,0.18)]'
    : hasFire
    ? 'border-orange-400/35 bg-orange-400/[0.05] shadow-[0_0_24px_rgba(251,146,60,0.18)]'
    : 'border-white/10 bg-white/[0.03]';
  const iconWrapClass = hasFire
    ? 'bg-orange-400/15 text-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.4)]'
    : 'bg-brand-cyan/15 text-brand-cyan';

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${containerClass}`}>
      <div
        className={`grid size-14 shrink-0 place-items-center rounded-xl ${iconWrapClass}`}
        aria-hidden="true"
      >
        <Flame size={26} strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-3xl font-extrabold leading-none text-white">{streak.current}</p>
        <p className="mt-1 text-xs font-bold text-white/72">
          {streak.current === 1 ? 'día seguido entrenando' : 'días seguidos entrenando'}
        </p>
        {streak.longest > streak.current ? (
          <p className="mt-1 text-[0.65rem] font-semibold text-white/45">
            Récord histórico: {streak.longest} días
          </p>
        ) : null}
      </div>
    </div>
  );
}
