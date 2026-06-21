'use client';

// Mapa vertical estilo "journey de montaña". Reemplaza el antiguo
// PlanTimeline (acordeón) por una visualización donde cada sesión es un
// nodo, conectado al siguiente con una línea curva sutil.
//
// Reglas visuales (spec):
// - Fondo brand-dark (#0A0F1A), línea de conexión #1F2937, nodos activos
//   en brand-cyan (#2DD4BF).
// - Mobile-first, vertical, max 380px.
// - Nodo de hoy: animate-pulse + glow turquesa.
// - Nodos completados: check verde, glow sutil.
// - Nodos futuros: gris apagado.
//
// Conservamos las piezas funcionales del PlanTimeline previo: header con
// objetivo, 3 stats, FreePlanWindowBanner, FreePlan regen button con
// contador de planes/mes.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  CheckCircle2,
  Dumbbell,
  Heart,
  Moon,
  Mountain,
  RefreshCw,
  Sparkles,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { FreePlanWindowBanner } from '@/components/billing/FreePlanWindowBanner';
import { useBillingStatus } from '@/lib/hooks/useBillingStatus';
import { loadTrainingPlan, type Session, type TrainingPlan, type Week } from '@/lib/plan';
import { withDerivedCurrentWeek } from '@/lib/training/current-session';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatPlanStatus(status: TrainingPlan['status']): string {
  const labels: Record<TrainingPlan['status'], string> = {
    active: 'Activo',
    completed: 'Completado',
    paused: 'Pausado'
  };
  return labels[status];
}

// Heurística simple para asignar un mini ícono por sesión según
// contenido. Si el spec necesita más fidelidad, lo expandimos.
function getSessionIcon(session: Session) {
  const text = `${session.title} ${session.stimulusType ?? ''} ${session.objective ?? ''}`.toLowerCase();
  if (/(descanso|recuperaci|movilid|deload|reposo)/.test(text)) return Moon;
  if (/(cardio|fondo|aer[oó]bico|resistencia)/.test(text)) return Heart;
  if (/(hangboard|fuerza|campus|max|press|sentadilla|peso muerto|dominad)/.test(text)) {
    return Dumbbell;
  }
  if (/(boulder|v[ií]a|escalada|gimnasio|roca|outdoor)/.test(text)) return Mountain;
  return Sparkles;
}

type SessionStatus = 'completed' | 'today' | 'future';

function sessionStatus(
  weekNumber: number,
  session: Session,
  currentWeek: number
): SessionStatus {
  if (session.completed) return 'completed';
  if (weekNumber === currentWeek) return 'today';
  if (weekNumber < currentWeek) return 'completed';
  return 'future';
}

function formatResetShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// ---------- Componente principal ----------

export function PlanJourneyMap() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const billing = useBillingStatus();

  useEffect(() => {
    const stored = loadTrainingPlan();
    setPlan(stored ? withDerivedCurrentWeek(stored) : null);
  }, []);

  const completedSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).filter((s) => s.completed).length : 0),
    [plan]
  );
  const totalSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).length : 0),
    [plan]
  );

  if (!plan) {
    return (
      <section className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">
            Mi Plan
          </p>
          <h1 className="text-3xl font-extrabold leading-tight">Plan de entrenamiento</h1>
        </header>
        <Card variant="hero" className="relative overflow-hidden">
          <MountainBackdrop />
          <div className="relative">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-cyan/14 text-brand-cyan">
              <Target aria-hidden="true" size={24} strokeWidth={2.3} />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold">Aún no tienes un plan activo</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Completa tu perfil para que BilClimb genere una periodización adaptada a
              tu objetivo, días disponibles, equipo y contexto físico.
            </p>
            <Button href="/onboarding" size="lg" className="mt-6 w-full">
              Crear mi primer plan
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Mi Plan</p>
        <h1 className="text-3xl font-extrabold leading-tight">
          {plan.mesocycleType || `Plan de ${plan.totalWeeks} semanas`}
        </h1>
        <p className="text-sm leading-6 text-white/64">
          Objetivo: {plan.mainObjective || plan.objective || 'Sin objetivo declarado'} ·
          Inicio: {formatDate(plan.startDate)}
        </p>
        {plan.usedFileSearch ? (
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-brand-cyan/25 bg-brand-cyan/[0.08] px-3 py-2 text-xs font-bold text-brand-cyan">
            <BookOpenCheck aria-hidden="true" size={13} strokeWidth={2.4} />
            Plan basado en biblioteca BilClimb
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Semana" value={`${plan.currentWeek}/${plan.totalWeeks}`} tone="cyan" />
        <Stat label="Sesiones" value={`${completedSessions}/${totalSessions}`} tone="mustard" />
        <Stat label="Estado" value={formatPlanStatus(plan.status)} tone="cyan" />
      </div>

      {billing ? (
        <FreePlanWindowBanner
          freePlanExpiresAt={billing.freePlanExpiresAt}
          hasActiveSubscription={billing.hasActiveSubscription}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[380px]">
        {plan.weeks.map((week, weekIdx) => (
          <WeekJourney
            key={week.weekNumber}
            week={week}
            currentWeek={plan.currentWeek}
            isLastWeek={weekIdx === plan.weeks.length - 1}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <RegenButton planRegen={billing?.planRegen} />
        <Button variant="secondary" href="/profile">
          Editar objetivo
        </Button>
      </div>
    </motion.section>
  );
}

// ---------- Sub: WeekJourney ----------

function WeekJourney({
  week,
  currentWeek,
  isLastWeek
}: {
  week: Week;
  currentWeek: number;
  isLastWeek: boolean;
}) {
  const sessionsCount = week.sessions.length;
  return (
    <section className="mb-6 last:mb-0">
      <header className="mb-4 text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/45">
          Semana {week.weekNumber}
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-white">
          {week.theme || week.objective || 'Bloque de trabajo'}
        </h2>
        <p className="mt-1 text-xs font-bold text-white/55">
          {sessionsCount} {sessionsCount === 1 ? 'sesión' : 'sesiones'}
        </p>
      </header>

      <ol className="relative flex flex-col items-center">
        {week.sessions.map((session, sessionIdx) => {
          const status = sessionStatus(week.weekNumber, session, currentWeek);
          const lastInWeek = sessionIdx === week.sessions.length - 1;
          return (
            <SessionNode
              key={`${week.weekNumber}-${session.dayNumber}`}
              weekNumber={week.weekNumber}
              session={session}
              status={status}
              showConnector={!(lastInWeek && isLastWeek)}
              // Alternar offset para sensación de "camino que sube".
              offset={sessionIdx % 2 === 0 ? 'left' : 'right'}
            />
          );
        })}
      </ol>
    </section>
  );
}

// ---------- Sub: SessionNode ----------

function SessionNode({
  weekNumber,
  session,
  status,
  showConnector,
  offset
}: {
  weekNumber: number;
  session: Session;
  status: SessionStatus;
  showConnector: boolean;
  offset: 'left' | 'right';
}) {
  const Icon = getSessionIcon(session);

  // Estados visuales del nodo.
  const stateClass =
    status === 'completed'
      ? 'border-brand-cyan/70 bg-brand-cyan text-brand-dark shadow-[0_0_18px_rgba(45,212,191,0.32)]'
      : status === 'today'
      ? 'border-brand-cyan bg-brand-cyan/15 text-brand-cyan shadow-[0_0_22px_rgba(45,212,191,0.5)] animate-pulse'
      : 'border-white/12 bg-white/[0.03] text-white/45';

  const labelClass =
    status === 'future' ? 'text-white/40' : 'text-white/82';

  // Translación horizontal sutil para el efecto serpenteante.
  const offsetClass = offset === 'left' ? '-translate-x-2' : 'translate-x-2';

  return (
    <li className="relative flex w-full flex-col items-center">
      <Link
        href={`/session?week=${weekNumber}&day=${session.dayNumber}`}
        className={`group relative z-10 flex flex-col items-center transition ${offsetClass}`}
        aria-label={`Sesión día ${session.dayNumber}: ${session.title}`}
      >
        <span
          className={`grid size-14 place-items-center rounded-full border-2 transition ${stateClass}`}
        >
          {status === 'completed' ? (
            <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />
          ) : status === 'today' ? (
            <Icon aria-hidden="true" size={22} strokeWidth={2.4} />
          ) : (
            <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
          )}
        </span>
        <p className={`mt-2 max-w-[180px] text-center text-xs font-bold ${labelClass}`}>
          {session.title}
        </p>
        <p className="text-[0.65rem] font-semibold text-white/40">Día {session.dayNumber}</p>
      </Link>

      {showConnector ? (
        // Línea conectora curva — SVG con bezier sutil, color #1F2937.
        <svg
          aria-hidden="true"
          width="40"
          height="44"
          viewBox="0 0 40 44"
          className="my-1 text-[#1F2937]"
        >
          {/* Curva S sutil */}
          <path
            d={offset === 'left' ? 'M20 0 C 30 18, 10 26, 20 44' : 'M20 0 C 10 18, 30 26, 20 44'}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </li>
  );
}

// ---------- Sub: RegenButton (con cupo mensual) ----------

function RegenButton({
  planRegen
}: {
  planRegen?: { count: number; max: number; resetAt: string };
}) {
  if (!planRegen) {
    return (
      <Button variant="secondary" href="/generating-plan" icon={<RefreshCw size={17} />}>
        Regenerar plan
      </Button>
    );
  }

  const exhausted = planRegen.count >= planRegen.max;
  const resetShort = formatResetShort(planRegen.resetAt);

  if (exhausted) {
    return (
      <div className="flex flex-col items-stretch gap-1">
        <span
          aria-disabled="true"
          title={`Disponible nuevamente el ${resetShort}`}
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/45"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Regenerar plan
        </span>
        <p className="text-center text-[0.7rem] font-bold text-white/55">
          {planRegen.max}/{planRegen.max} — disponible el {resetShort}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button variant="secondary" href="/generating-plan" icon={<RefreshCw size={17} />}>
        Regenerar plan
      </Button>
      <p className="text-center text-[0.7rem] font-bold text-white/55">
        Planes este mes: {planRegen.count}/{planRegen.max}
      </p>
    </div>
  );
}

