'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  MessageCircle,
  PencilLine,
  TimerReset
} from 'lucide-react';
import { loadCheckIns, type CheckIn } from '@/lib/checkin';
import { loadTrainingPlan, type Session, type TrainingPlan } from '@/lib/plan';
import { loadProfile, loadProfileNeedsRegeneration, type UserProfile } from '@/lib/profile';
import {
  getTodayTrainingState,
  withDerivedCurrentWeek,
  type TodayTrainingState
} from '@/lib/training/current-session';

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return 'Ayer';
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(date);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getSessionObjective(session: Session) {
  const mainWork = session.mainBlock
    .map((exercise) => exercise.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(' + ');

  return mainWork || session.title;
}

function getSessionIntensity(session: Session) {
  const explicitIntensity = [...session.warmup, ...session.mainBlock, ...session.cooldown]
    .map((exercise) => exercise.intensity)
    .find((value): value is string => Boolean(value));

  return explicitIntensity ?? 'Moderada y controlada';
}

function getRiskEstimate(checkIns: CheckIn[]) {
  const recentCheckIns = checkIns.slice(0, 3);

  if (recentCheckIns.length === 0) {
    return {
      label: 'Sin datos aún',
      detail: 'Después de tus primeros check-ins estimaremos carga, dolor y recuperación.',
      tone: 'unknown' as const
    };
  }

  const averageRpe = getAverage(recentCheckIns.map((checkIn) => checkIn.rpe));
  const averageFingerPain = getAverage(recentCheckIns.map((checkIn) => checkIn.fingerPain));
  const averageEnergy = getAverage(recentCheckIns.map((checkIn) => checkIn.energy));
  const averageSleep = getAverage(recentCheckIns.map((checkIn) => checkIn.sleep));

  if (averageFingerPain >= 5 || averageRpe >= 8 || averageEnergy <= 2 || averageSleep <= 2) {
    return {
      label: 'Riesgo alto',
      detail: 'Baja intensidad, evita dolor punzante y prioriza técnica o movilidad.',
      tone: 'high' as const
    };
  }

  if (averageFingerPain >= 3 || averageRpe >= 7 || averageEnergy <= 3 || averageSleep <= 3) {
    return {
      label: 'Riesgo medio',
      detail: 'Calienta más largo y deja 1-2 intentos en reserva.',
      tone: 'medium' as const
    };
  }

  return {
    label: 'Riesgo bajo',
    detail: 'Tus últimos check-ins se ven estables. Mantén la ejecución limpia.',
    tone: 'low' as const
  };
}

function getRiskClassName(tone: ReturnType<typeof getRiskEstimate>['tone']) {
  if (tone === 'high') {
    return 'border-red-400/30 bg-red-400/10 text-red-100';
  }

  if (tone === 'medium' || tone === 'unknown') {
    return 'border-brand-mustard/30 bg-brand-mustard/10 text-brand-mustard';
  }

  return 'border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan';
}

function getSessionHref(todayState: Extract<TodayTrainingState, { session: Session }>) {
  return `/session?week=${todayState.week.weekNumber}&day=${todayState.session.dayNumber}`;
}

export function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    const storedPlan = loadTrainingPlan();
    setPlan(storedPlan ? withDerivedCurrentWeek(storedPlan) : null);
    setCheckIns(loadCheckIns());
    setNeedsRegeneration(loadProfileNeedsRegeneration());
  }, []);

  const todayState = useMemo(() => (plan ? getTodayTrainingState(plan) : null), [plan]);
  const totalSessions = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.weeks.flatMap((week) => week.sessions).length;
  }, [plan]);
  const completedSessions = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.weeks.flatMap((week) => week.sessions).filter((session) => session.completed)
      .length;
  }, [plan]);
  const latestCheckIn = checkIns[0] ?? null;
  const displayName = profile?.name || 'climber';
  const characterName = profile?.character === 'senda' ? 'Senda' : 'Bill';

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-cyan">Hola, {displayName}</p>
        <h1 className="text-3xl font-bold leading-tight">Tu sesión de hoy</h1>
      </div>

      <TodaySessionCard todayState={todayState} hasPlan={Boolean(plan)} checkIns={checkIns} />

      {needsRegeneration ? (
        <div className="rounded-lg border border-brand-mustard/30 bg-brand-mustard/10 p-4">
          <p className="text-sm font-bold text-brand-mustard">Tu perfil cambió</p>
          <p className="mt-2 text-sm leading-6 text-white/72">
            Regenera el plan para que use tu objetivo, equipo y molestias actualizadas.
          </p>
          <Link
            href="/generating-plan"
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark"
          >
            Regenerar plan
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/plan" className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <ClipboardList aria-hidden="true" size={22} className="text-brand-cyan" />
          <p className="mt-3 text-sm text-white/60">Plan</p>
          <p className="mt-2 text-xl font-bold">
            {plan ? `Sem ${plan.currentWeek}/${plan.totalWeeks}` : 'Sin plan'}
          </p>
        </Link>
        <Link href="/progress" className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <BarChart3 aria-hidden="true" size={22} className="text-brand-mustard" />
          <p className="mt-3 text-sm text-white/60">Progreso</p>
          <p className="mt-2 text-xl font-bold">
            {plan ? `${completedSessions}/${totalSessions}` : `${checkIns.length} checks`}
          </p>
        </Link>
      </div>

      <Link
        href="/checkin?manual=1"
        className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-mustard/14 text-brand-mustard">
          <PencilLine aria-hidden="true" size={22} />
        </div>
        <div>
          <p className="font-bold">Registrar algo fuera del plan</p>
          <p className="mt-1 text-sm text-white/58">Guarda roca, movilidad o una adaptación manual.</p>
        </div>
      </Link>

      <Link
        href="/chat"
        className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
          <MessageCircle aria-hidden="true" size={23} />
        </div>
        <div>
          <p className="font-bold">¿Dudas? Habla con {characterName}</p>
          <p className="mt-1 text-sm text-white/58">Con perfil, plan y check-ins como contexto.</p>
        </div>
      </Link>

      <LastCheckInCard checkIn={latestCheckIn} />
    </section>
  );
}

function TodaySessionCard({
  todayState,
  hasPlan,
  checkIns
}: {
  todayState: TodayTrainingState | null;
  hasPlan: boolean;
  checkIns: CheckIn[];
}) {
  if (!hasPlan) {
    return (
      <div className="rounded-lg border border-brand-cyan/25 bg-white/[0.05] p-5 shadow-glow">
        <h2 className="text-2xl font-bold">Crea tu primer plan</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Completa el onboarding para generar una periodización adaptada a tu objetivo,
          equipo, energía y contexto físico.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 block w-full rounded-md bg-brand-cyan px-4 py-3 text-center text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          Crear mi primer plan
        </Link>
      </div>
    );
  }

  if (!todayState || todayState.kind === 'rest') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-semibold text-brand-cyan">Hoy toca</p>
        <h2 className="mt-2 text-2xl font-bold">Recuperación</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          {todayState?.message ?? 'Estiramiento suave, movilidad y recuperación cuentan como entrenamiento.'}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/checkin?manual=1&adapt=1"
            className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-brand-cyan/40 hover:text-brand-cyan"
          >
            Adaptar porque hoy no puedo
          </Link>
          <Link
            href="/checkin?manual=1"
            className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-brand-mustard/40 hover:text-brand-mustard"
          >
            Registrar algo fuera del plan
          </Link>
        </div>
      </div>
    );
  }

  if (todayState.kind === 'plan-completed') {
    return (
      <div className="rounded-lg border border-brand-mustard/24 bg-brand-mustard/10 p-5">
        <h2 className="text-2xl font-bold">Plan completado</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">{todayState.message}</p>
        <Link
          href="/progress"
          className="mt-5 block w-full rounded-md bg-brand-cyan px-4 py-3 text-center text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          Ver progreso
        </Link>
      </div>
    );
  }

  const { week, session } = todayState;
  const risk = getRiskEstimate(checkIns);
  const callToAction =
    todayState.kind === 'needs-checkin'
      ? 'Registrar check-in pendiente'
      : todayState.kind === 'completed'
        ? 'Ver progreso'
        : 'Empezar sesión';
  const href =
    todayState.kind === 'needs-checkin'
      ? '/checkin'
      : todayState.kind === 'completed'
        ? '/progress'
        : getSessionHref(todayState);

  return (
    <div className="rounded-lg border border-brand-cyan/25 bg-white/[0.05] p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-cyan">Hoy toca</p>
          <p className="mt-2 text-sm font-semibold text-brand-mustard">
            Día {session.dayNumber} de Semana {week.weekNumber}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{session.title}</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1 text-sm text-white/70">
          <TimerReset aria-hidden="true" size={15} />
          ~{session.estimatedMinutes} min
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SessionFact label="Objetivo de la sesión" value={getSessionObjective(session)} />
        <SessionFact label="Duración" value={`~${session.estimatedMinutes} min`} />
        <SessionFact label="Intensidad" value={getSessionIntensity(session)} />
        <SessionFact label="Lugar" value={session.location} />
      </div>
      <div className={`mt-4 rounded-lg border p-4 ${getRiskClassName(risk.tone)}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden="true" size={17} />
          <p className="text-sm font-bold">{risk.label}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/68">{risk.detail}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/70">{todayState.message}</p>
      <Link
        href={href}
        className="mt-5 block w-full rounded-md bg-brand-cyan px-4 py-3 text-center text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
      >
        {callToAction}
      </Link>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/checkin?manual=1&adapt=1&sessionId=${encodeURIComponent(todayState.sessionId)}`}
          className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-brand-cyan/40 hover:text-brand-cyan"
        >
          Adaptar porque hoy no puedo
        </Link>
        <Link
          href="/checkin?manual=1"
          className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-brand-mustard/40 hover:text-brand-mustard"
        >
          Registrar algo fuera del plan
        </Link>
      </div>
    </div>
  );
}

function SessionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-brand-dark/36 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/42">{label}</p>
      <p className="mt-2 text-sm font-bold leading-5 text-white">{value}</p>
    </div>
  );
}

function LastCheckInCard({ checkIn }: { checkIn: CheckIn | null }) {
  if (!checkIn) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-semibold text-white">Aún no hay check-ins</p>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Cuando termines tu primera sesión, el resumen aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm font-semibold text-white">Último check-in: {formatRelativeDate(checkIn.date)}</p>
      {checkIn.manualActivity ? (
        <p className="mt-2 text-sm font-bold text-brand-cyan">{checkIn.manualActivity.title}</p>
      ) : null}
      <p className="mt-2 text-sm text-white/68">
        RPE: {checkIn.rpe}/10 | Dedos: {checkIn.fingerPain}/10 | Energía: {checkIn.energy}/5
      </p>
    </div>
  );
}
