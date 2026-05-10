'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, ClipboardList, MessageCircle, TimerReset } from 'lucide-react';
import { loadCheckIns, type CheckIn } from '@/lib/checkin';
import { loadTrainingPlan, type TrainingPlan } from '@/lib/plan';
import { loadProfile, type UserProfile } from '@/lib/profile';
import { getTodayTrainingState, type TodayTrainingState } from '@/lib/training/current-session';

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

export function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    setProfile(loadProfile());
    setPlan(loadTrainingPlan());
    setCheckIns(loadCheckIns());
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

      <TodaySessionCard todayState={todayState} hasPlan={Boolean(plan)} />

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
  hasPlan
}: {
  todayState: TodayTrainingState | null;
  hasPlan: boolean;
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
        <h2 className="text-2xl font-bold">Hoy descansas</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          {todayState?.message ?? 'Estiramiento suave, movilidad y recuperación cuentan como entrenamiento.'}
        </p>
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
  const callToAction = todayState.kind === 'needs-checkin' ? 'Registrar check-in pendiente' : 'Ver sesión completa';
  const href = todayState.kind === 'needs-checkin' ? '/checkin' : '/session';

  return (
    <div className="rounded-lg border border-brand-cyan/25 bg-white/[0.05] p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-mustard">
            Día {session.dayNumber} de Semana {week.weekNumber}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{session.title}</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1 text-sm text-white/70">
          <TimerReset aria-hidden="true" size={15} />
          ~{session.estimatedMinutes} min
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/70">
        {todayState.message} {session.location} ·{' '}
        {session.mainBlock.map((exercise) => exercise.name).slice(0, 3).join(' + ')}
      </p>
      <Link
        href={href}
        className="mt-5 block w-full rounded-md bg-brand-cyan px-4 py-3 text-center text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
      >
        {callToAction}
      </Link>
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
      <p className="mt-2 text-sm text-white/68">
        RPE: {checkIn.rpe}/10 | Dedos: {checkIn.fingerPain}/10 | Energía: {checkIn.energy}/5
      </p>
    </div>
  );
}
