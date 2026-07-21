/**
 * ProgressView · client · Fase 4 UI · Batch 2 (F4-UI.6).
 *
 * DoD (Giuliana 2026-07-21):
 *   - tokens bil-* · CTA bil-red único · voz "tú"
 *   - nav de 4 items · Progreso activo
 *   - cero jerga del motor
 *   - CONSTANCIA primero, NUNCA "X roja", días de descanso son puntos
 *     gris/verde, no fallas
 *   - grado / colgado no aparece · se celebra en retest (feature aparte)
 *   - Estado "primera vez" con card cálida "Aquí va a vivir tu historia"
 *     en vez de gráficas vacías
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';

type DayState = 'done' | 'today' | 'upcoming' | 'rest';
type Feeling = 'bien' | 'cansancio' | 'molestia';

export interface ProgressMoment {
  when: string; // "Ayer" · "Hace 3 días"
  label: string; // "Terminaste tu sesión de dedos suaves"
  feeling?: Feeling;
}

export interface ProgressSnapshot {
  firstTime: boolean;
  weekLabel: string;
  weekPath: Array<{ label: string; state: DayState }>;
  streak: number;
  sessionsThisWeek: number;
  chapter: {
    title: string;
    subtitle: string;
    sessionsDone: number;
    sessionsTotal: number;
  };
  moments: ProgressMoment[];
}

export interface ProgressViewProps {
  character: 'bill' | 'senda';
  snapshot: ProgressSnapshot;
}

export function ProgressView({ character, snapshot }: ProgressViewProps) {
  const { firstTime, weekPath, streak, sessionsThisWeek, chapter, moments } =
    snapshot;

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
            Progreso
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
        {/* Hero · constancia. Streak con badge bil-gold + sesiones semana. */}
        <section className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bil-gold flex items-center justify-center shadow-[0_4px_12px_rgba(242,178,60,0.35)]">
            <span
              className="material-symbols-outlined text-white text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              military_tech
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-bil-ink/60 uppercase tracking-wider">
              Racha
            </p>
            <p className="text-display-lg text-bil-ink leading-none">
              {streak}
              <span className="text-headline-md text-bil-ink/60 ml-1">
                {streak === 1 ? 'semana' : 'semanas'}
              </span>
            </p>
            <p className="text-body-md text-bil-ink/70 mt-1">
              {sessionsThisWeek} {sessionsThisWeek === 1 ? 'sesión' : 'sesiones'} esta
              semana. Vas parejo.
            </p>
          </div>
        </section>

        {/* Estado "primera vez" — solo si aún no hay data real */}
        {firstTime && (
          <section className="bg-bil-cream border-l-4 border-bil-green rounded-DEFAULT p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-bil-green mt-0.5">
              auto_stories
            </span>
            <div>
              <p className="font-bold text-bil-ink">
                Aquí va a vivir tu historia
              </p>
              <p className="text-body-md text-bil-ink/70 mt-1 leading-snug">
                Cuando termines tus primeras sesiones, este espacio se llena
                con tu camino: los días que apareciste, los que descansaste, y
                cómo te fuiste sintiendo. Sin apuro.
              </p>
            </div>
          </section>
        )}

        {/* Semana como camino · sin X rojas · descansos son puntos suaves */}
        <section className="bg-white/70 rounded-DEFAULT p-5 border border-bil-ink/5">
          <p className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-4">
            Esta semana
          </p>
          <div className="flex justify-between items-start px-1">
            {weekPath.map((day) => (
              <WeekDay key={day.label} label={day.label} state={day.state} />
            ))}
          </div>
          <p className="text-label-md text-bil-ink/50 mt-5 text-center leading-snug">
            Los días de descanso también cuentan.
          </p>
        </section>

        {/* Capítulo actual · progreso hasta cierre */}
        <section className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
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
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-bil-ink/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-bil-green rounded-full transition-all duration-500"
                style={{
                  width: `${(chapter.sessionsDone / chapter.sessionsTotal) * 100}%`,
                }}
              />
            </div>
            <span className="text-label-md font-bold text-bil-ink/70 tabular-nums">
              {chapter.sessionsDone} / {chapter.sessionsTotal}
            </span>
          </div>
          <p className="text-label-md text-bil-ink/60 mt-3 leading-snug">
            Cuando cierres el capítulo, hacemos retest — sin examen. Solo para
            ver cómo respondes ahora.
          </p>
        </section>

        {/* Momentos recientes · cálidos, celebra, no clasifica */}
        {moments.length > 0 && (
          <section>
            <h3 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
              Momentos
            </h3>
            <div className="space-y-3">
              {moments.map((m, i) => (
                <MomentRow key={i} moment={m} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav active="progreso" />

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

function WeekDay({ label, state }: { label: string; state: DayState }) {
  // Regla Giuliana: NUNCA X roja. Descanso = punto tranquilo, no falla.
  if (state === 'done') {
    return (
      <div className="flex flex-col items-center gap-1.5">
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
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-12 h-12 rounded-full bg-bil-gold text-white flex items-center justify-center shadow-[0_4px_12px_rgba(242,178,60,0.35)] border-4 border-bil-cream">
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
  if (state === 'rest') {
    // Punto suave crema-oscuro · descanso NO es falla
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full bg-bil-cream border-2 border-bil-green/25 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-bil-green/50">
            bedtime
          </span>
        </div>
        <span className="text-label-md text-bil-green/70">{label}</span>
      </div>
    );
  }
  // upcoming
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-10 h-10 rounded-full border-2 border-bil-ink/20" />
      <span className="text-label-md text-bil-ink/50">{label}</span>
    </div>
  );
}

function MomentRow({ moment }: { moment: ProgressMoment }) {
  const iconMap: Record<Feeling, { icon: string; cls: string }> = {
    bien: {
      icon: 'sentiment_satisfied',
      cls: 'bg-bil-green/10 text-bil-green',
    },
    cansancio: { icon: 'bolt', cls: 'bg-bil-gold/15 text-bil-gold' },
    molestia: { icon: 'sentiment_neutral', cls: 'bg-bil-red/10 text-bil-red' },
  };
  const meta = moment.feeling
    ? iconMap[moment.feeling]
    : { icon: 'circle', cls: 'bg-bil-ink/10 text-bil-ink/60' };
  return (
    <article className="bg-white/70 rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.cls}`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {meta.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-md text-bil-ink/60">{moment.when}</p>
        <p className="text-body-md text-bil-ink leading-snug">{moment.label}</p>
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
