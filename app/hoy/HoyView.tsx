/**
 * HoyView · client component · Fase 4 UI piloto #2.
 *
 * Traducción fiel de docs/design/carpeta_3/hoy_bilclimb_1/code.html.
 * Consume una `AssembledSession` del motor invertido (Fase 3) y renderiza:
 *   - TopAppBar: avatar coach + título de sesión + streak badge
 *   - Welcome section: sticker Bill + rationale del coach (del LLM)
 *   - Session card: título + "¿Por qué esto hoy?" + botón "Empezar sesión"
 *   - Progress path: 4 pasos de la semana (mountain-path)
 *   - Quote
 *   - Bottom nav: Hoy · Plan · Progreso · Chat (4 items, corrección global #1)
 *
 * Sin AppShell — /hoy en routesWithoutShell.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { AssembledSession } from '@/lib/brain/motor-inverted/assembler';

export interface WeekPathStep {
  label: string;
  state: 'completed' | 'today' | 'upcoming';
}

export interface HoyViewProps {
  session: AssembledSession | null;
  focusRule: string | null;
  streak: number;
  weekPath: WeekPathStep[];
  error: string | null;
}

export function HoyView({ session, focusRule, streak, weekPath, error }: HoyViewProps) {
  const router = useRouter();
  const sessionTitle = session?.title ?? 'Preparando tu sesión...';
  const rationale =
    session?.rationale ??
    'Estamos armando tu sesión para hoy. Vas a poder empezar en un momento.';

  return (
    <div className="min-h-screen pb-24 bg-surface text-on-surface font-nunito">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface flex justify-between items-center px-margin-mobile h-touch-target w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
            <Image
              src="/characters/bill-avatar.png"
              alt="Coach Bill"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-headline-md-mobile font-bold text-primary">
            {focusRule ? focusPhaseLabel(focusRule) : 'Bienvenido/a'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 streak-badge px-3 py-1 rounded-full text-white font-bold text-sm">
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              military_tech
            </span>
            <span>{streak}</span>
          </div>
          <Link
            href="/settings"
            aria-label="Ajustes y perfil"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>
        </div>
      </header>

      <main className="mt-16 px-margin-mobile space-y-6 max-w-lg mx-auto">
        {/* Welcome + coach rationale */}
        <section className="mt-8">
          <div className="bg-surface-container-low rounded-DEFAULT p-card-padding soft-card-shadow relative overflow-hidden border border-surface-variant/50">
            <div className="flex gap-4 items-start relative z-10">
              <div className="flex-shrink-0">
                <Image
                  src="/characters/bill-full.png"
                  alt="Coach Bill sticker"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover -rotate-3"
                />
              </div>
              <div className="space-y-2">
                <p className="text-body-lg text-ink-text leading-relaxed">
                  {rationale}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sesión de hoy */}
        <section>
          <div className="bg-white rounded-DEFAULT p-card-padding soft-card-shadow border-2 border-primary-container/10">
            <div className="mb-4">
              <span className="text-label-lg text-primary uppercase tracking-wider">
                Sesión de hoy
              </span>
              <h2 className="text-headline-lg-mobile text-ink-text mt-1">
                {sessionTitle}
              </h2>
            </div>

            {error ? (
              <div className="bg-error-container/40 rounded p-4 mb-6 text-on-error-container text-body-md">
                No pude armar tu sesión ahora mismo. {error}
              </div>
            ) : session ? (
              <div className="bg-surface-container rounded p-4 mb-6 border-l-4 border-wood-tan">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-wood-tan mt-1">
                    lightbulb
                  </span>
                  <div>
                    <p className="text-label-lg text-on-surface-variant">
                      ¿Por qué esto hoy?
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      {session.exercises.length} ejercicio
                      {session.exercises.length === 1 ? '' : 's'} pensados para
                      tu condición actual · fase{' '}
                      <strong>{session.focus.phase}</strong> con techo{' '}
                      <strong>{session.focus.maxRiskLevel}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={!session}
              onClick={() => router.push('/session')}
              className="w-full h-touch-target bg-secondary text-on-primary font-bold text-headline-md-mobile rounded-full shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {session ? 'Empezar sesión' : 'Preparando...'}
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
          </div>
        </section>

        {/* Progress Path */}
        <section className="py-4">
          <h3 className="text-label-lg text-on-surface-variant uppercase mb-6">
            Tu camino esta semana
          </h3>
          <div className="relative flex justify-between items-center px-4 mountain-path">
            {weekPath.map((step) => (
              <WeekStep key={step.label} label={step.label} state={step.state} />
            ))}
          </div>
        </section>

        {/* Quote */}
        <section className="text-center pb-8 opacity-60 italic text-body-md text-on-surface-variant">
          &ldquo;La constancia es la montaña más alta.&rdquo;
        </section>
      </main>

      {/* Bottom Nav · 4 items (corrección global #1) */}
      <BottomNav active="hoy" />

      {/*
       * Estilos custom del code.html de Stitch. Los movemos a styled-jsx
       * en vez de globals.css para mantener aislado al piloto.
       */}
      <style jsx>{`
        .active-nav-shadow {
          box-shadow: 0 4px 12px rgba(47, 125, 99, 0.2);
        }
        .soft-card-shadow {
          box-shadow: 0 8px 24px rgba(36, 31, 28, 0.08);
        }
        .streak-badge {
          background: linear-gradient(135deg, #ffd93d 0%, #ff8400 100%);
          box-shadow: 0 2px 8px rgba(255, 132, 0, 0.3);
        }
        .mountain-path::before {
          content: '';
          position: absolute;
          top: 30%;
          left: 0;
          right: 0;
          height: 4px;
          background: #bec9c2;
          z-index: 0;
          transform: translateY(-50%);
        }
      `}</style>
      <style jsx global>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
    </div>
  );
}

function WeekStep({ label, state }: WeekPathStep) {
  if (state === 'completed') {
    return (
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-surface">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <span className="text-label-md text-primary mt-2">{label}</span>
      </div>
    );
  }
  if (state === 'today') {
    return (
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white border-4 border-secondary flex items-center justify-center text-secondary ring-4 ring-surface shadow-md">
          <span className="material-symbols-outlined text-[24px]">adjust</span>
        </div>
        <span className="text-label-md text-secondary mt-2 font-bold">{label}</span>
      </div>
    );
  }
  return (
    <div className="relative z-10 flex flex-col items-center opacity-40">
      <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-outline flex items-center justify-center ring-4 ring-surface" />
      <span className="text-label-md text-on-surface-variant mt-2">{label}</span>
    </div>
  );
}

function BottomNav({ active }: { active: 'hoy' | 'plan' | 'progreso' | 'chat' }) {
  const items = [
    { key: 'hoy' as const, label: 'Hoy', href: '/hoy', icon: 'calendar_today' },
    { key: 'plan' as const, label: 'Plan', href: '/plan', icon: 'map' },
    { key: 'progreso' as const, label: 'Progreso', href: '/progress', icon: 'leaderboard' },
    { key: 'chat' as const, label: 'Chat', href: '/chat', icon: 'forum' },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-base h-16 bg-surface-container border-t-2 border-outline-variant shadow-sm"
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
                ? 'flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1 active-nav-shadow scale-95'
                : 'flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container-high transition-colors'
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

function focusPhaseLabel(focusRuleId: string): string {
  // Mapeo del FR-XXX a un título corto para el top bar. Deriva del
  // catalog v3.0 pero acá lo condensamos porque el chip es angosto.
  const map: Record<string, string> = {
    'FR-001': 'Seguridad hoy',
    'FR-002': 'Reconstrucción',
    'FR-003': 'Base conservadora',
    'FR-004': 'Reconstrucción dedos',
    'FR-005': 'Base técnica',
    'FR-006': 'Sesión específica',
    'FR-007': 'Complemento roca',
    'FR-008': 'Dosis mínima',
    'FR-009': 'Mantenimiento',
    'FR-010': 'Alternativa por equipo',
    'FR-011': 'Primer valor',
    'FR-012': 'Objetivo',
  };
  return map[focusRuleId] ?? 'Entrenamiento';
}
