/**
 * PlanView · client · Fase 4 UI · Batch 2 (F4-UI.6).
 *
 * DoD (Giuliana 2026-07-19):
 *   - tokens bil-* · CTA bil-red único · voz "tú"
 *   - nav de 4 items (Hoy · Plan · Progreso · Chat), Plan activo
 *   - cero jerga del motor (nada de "phase" / "focus.category")
 *
 * Regla del batch:
 *   - Plan = semana como capítulo, orden sugerido, tú eliges cuándo.
 *   - 3 sesiones: 1 completada · 1 actual (con CTA Empezar) · 1 pendiente.
 *   - Nunca "día X" — el usuario decide.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface PlannedSession {
  id: string;
  index: number;
  title: string;
  focusLabel: string; // narrativa corta · "Base técnica"
  durationMin: number;
  state: 'completed' | 'current' | 'upcoming';
}

export interface PlanViewProps {
  character: 'bill' | 'senda';
  chapter: {
    title: string; // "Capítulo de Montaña"
    subtitle: string; // "Entrada controlada"
    narrative: string; // del focus derivado
  };
  sessions: PlannedSession[];
}

export function PlanView({ character, chapter, sessions }: PlanViewProps) {
  const router = useRouter();
  const currentSession = sessions.find((s) => s.state === 'current');
  const completedCount = sessions.filter((s) => s.state === 'completed').length;

  return (
    <div className="min-h-screen pb-24 bg-bil-cream text-bil-ink font-nunito">
      {/* TopAppBar */}
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
          <h1 className="text-headline-md-mobile font-bold text-bil-green">
            Tu plan
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Ajustes y perfil"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>
      </header>

      <main className="pt-20 px-margin-mobile max-w-lg mx-auto space-y-6">
        {/* Capítulo actual · card con narrativa cálida del focus */}
        <section className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-label-lg uppercase tracking-wider text-bil-ink/60">
                {chapter.title}
              </p>
              <h2 className="text-headline-md text-bil-green font-bold mt-0.5">
                {chapter.subtitle}
              </h2>
            </div>
            <span className="material-symbols-outlined text-bil-green text-3xl flex-shrink-0">
              terrain
            </span>
          </div>
          <p className="text-body-md text-bil-ink/75 mt-3 leading-snug">
            {chapter.narrative}
          </p>
        </section>

        {/* Progreso de capítulo · "N de M completadas" */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-2 bg-bil-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-bil-green rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / sessions.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-label-md font-bold text-bil-ink/70 tabular-nums">
            {completedCount} / {sessions.length}
          </span>
        </div>

        {/* Sesiones sugeridas · orden pero no días específicos */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="text-label-lg uppercase tracking-wider text-bil-ink/60">
              Esta semana
            </h3>
            <span className="text-label-md text-bil-ink/50">
              {sessions.length} sesiones sugeridas
            </span>
          </div>
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onStart={() => router.push('/sesion')}
            />
          ))}
        </section>

        {/* Nota cálida · "tú eliges cuándo" · celebra descanso */}
        <div className="bg-bil-cream border-l-4 border-bil-green px-4 py-3 rounded-DEFAULT">
          <p className="text-body-md text-bil-ink/80 leading-snug">
            Tú eliges cuándo hacerlas — hoy, mañana o el sábado. Los días de
            descanso también cuentan.
          </p>
        </div>
      </main>

      {/* Bottom Nav · 4 items · Plan activo */}
      <BottomNav active="plan" />

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

function SessionCard({
  session,
  onStart,
}: {
  session: PlannedSession;
  onStart: () => void;
}) {
  if (session.state === 'completed') {
    return (
      <article className="bg-white/70 rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-4 opacity-80">
        <div className="w-10 h-10 rounded-full bg-bil-green text-white flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label-md text-bil-green font-bold uppercase tracking-wide">
            Sesión {session.index} · hecha
          </p>
          <h4 className="text-body-lg text-bil-ink font-bold truncate">
            {session.title}
          </h4>
        </div>
      </article>
    );
  }

  if (session.state === 'current') {
    return (
      <article className="bg-white rounded-DEFAULT p-5 border-2 border-bil-green shadow-[0_4px_12px_rgba(47,125,99,0.15)]">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-bil-green text-white flex items-center justify-center flex-shrink-0 font-bold">
            {session.index}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-bil-green font-bold uppercase tracking-wide">
              La que sigue · {session.durationMin} min
            </p>
            <h4 className="text-headline-md text-bil-ink font-bold leading-tight mt-1">
              {session.title}
            </h4>
            <p className="text-body-md text-bil-ink/70 mt-1">
              {session.focusLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="w-full h-[52px] bg-bil-red text-white rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          Empezar
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      </article>
    );
  }

  // upcoming
  return (
    <article className="bg-white/50 rounded-DEFAULT p-4 border border-bil-ink/10 flex items-center gap-4 opacity-70">
      <div className="w-10 h-10 rounded-full border-2 border-bil-ink/25 flex items-center justify-center font-bold text-bil-ink/40 flex-shrink-0">
        {session.index}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-md text-bil-ink/50 font-bold uppercase tracking-wide">
          Sesión {session.index} · {session.durationMin} min
        </p>
        <h4 className="text-body-lg text-bil-ink/85 font-bold truncate">
          {session.title}
        </h4>
      </div>
    </article>
  );
}

function BottomNav({ active }: { active: 'hoy' | 'plan' | 'progreso' | 'chat' }) {
  const items = [
    { key: 'hoy' as const, label: 'Hoy', href: '/hoy', icon: 'calendar_today' },
    { key: 'plan' as const, label: 'Plan', href: '/plan-v2', icon: 'map' },
    { key: 'progreso' as const, label: 'Progreso', href: '/progress-v2', icon: 'leaderboard' },
    { key: 'chat' as const, label: 'Chat', href: '/chat', icon: 'forum' },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-base h-16 bg-white border-t border-bil-ink/10 shadow-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={
              isActive
                ? 'flex flex-col items-center justify-center bg-bil-green/10 text-bil-green rounded-xl px-4 py-1 scale-95'
                : 'flex flex-col items-center justify-center text-bil-ink/60 px-4 py-1 hover:bg-bil-ink/5 transition-colors'
            }
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {it.icon}
            </span>
            <span className="text-label-md">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
