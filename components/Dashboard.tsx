'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Flame,
  PencilLine,
  Sparkles,
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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { Banner } from '@/components/ui/Banner';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { FreePlanWindowBanner } from '@/components/billing/FreePlanWindowBanner';
import { StreakBadge } from '@/components/StreakBadge';
import { PushOptIn } from '@/components/PushOptIn';
import { useBillingStatus } from '@/lib/hooks/useBillingStatus';
import { MyCoachBanner } from '@/components/coach/MyCoachBanner';

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;
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

type RiskEstimate = {
  label: string;
  detail: string;
  tone: 'high' | 'medium' | 'low' | 'unknown';
};

function getRiskEstimate(checkIns: CheckIn[]): RiskEstimate {
  const recentCheckIns = checkIns.slice(0, 3);
  if (recentCheckIns.length === 0) {
    return {
      label: 'Sin datos aún',
      detail: 'Después de tus primeros check-ins estimaremos carga, dolor y recuperación.',
      tone: 'unknown'
    };
  }
  const averageRpe = getAverage(recentCheckIns.map((c) => c.rpe));
  const averageFingerPain = getAverage(recentCheckIns.map((c) => c.fingerPain));
  const averageEnergy = getAverage(recentCheckIns.map((c) => c.energy));
  const averageSleep = getAverage(recentCheckIns.map((c) => c.sleep));
  if (averageFingerPain >= 5 || averageRpe >= 8 || averageEnergy <= 2 || averageSleep <= 2) {
    return {
      label: 'Riesgo alto',
      detail: 'Baja intensidad, evita dolor punzante y prioriza técnica o movilidad.',
      tone: 'high'
    };
  }
  if (averageFingerPain >= 3 || averageRpe >= 7 || averageEnergy <= 3 || averageSleep <= 3) {
    return {
      label: 'Riesgo medio',
      detail: 'Calienta más largo y deja 1-2 intentos en reserva.',
      tone: 'medium'
    };
  }
  return {
    label: 'Riesgo bajo',
    detail: 'Tus últimos check-ins se ven estables. Mantén la ejecución limpia.',
    tone: 'low'
  };
}

function riskBannerTone(tone: RiskEstimate['tone']): 'danger' | 'mustard' | 'cyan' | 'neutral' {
  if (tone === 'high') return 'danger';
  if (tone === 'medium' || tone === 'unknown') return 'mustard';
  if (tone === 'low') return 'cyan';
  return 'neutral';
}

function getSessionHref(todayState: Extract<TodayTrainingState, { session: Session }>) {
  return `/session?week=${todayState.week.weekNumber}&day=${todayState.session.dayNumber}`;
}

export function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const billing = useBillingStatus();

  useEffect(() => {
    setProfile(loadProfile());
    const storedPlan = loadTrainingPlan();
    setPlan(storedPlan ? withDerivedCurrentWeek(storedPlan) : null);
    setCheckIns(loadCheckIns());
    setNeedsRegeneration(loadProfileNeedsRegeneration());
  }, []);

  const todayState = useMemo(() => (plan ? getTodayTrainingState(plan) : null), [plan]);
  const totalSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).length : 0),
    [plan]
  );
  const completedSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).filter((s) => s.completed).length : 0),
    [plan]
  );
  const latestCheckIn = checkIns[0] ?? null;
  const displayName = profile?.name || 'climber';
  const characterName = profile?.character === 'senda' ? 'Senda' : 'Bill';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <header className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">
          Hola, {displayName}
        </p>
        <h1 className="text-[2.05rem] font-extrabold leading-tight">Tu sesión de hoy</h1>
      </header>

      <StreakBadge />

      <PushOptIn />

      <MyCoachBanner />

      <TodaySessionCard todayState={todayState} hasPlan={Boolean(plan)} checkIns={checkIns} />

      {billing ? (
        <FreePlanWindowBanner
          freePlanExpiresAt={billing.freePlanExpiresAt}
          hasActiveSubscription={billing.hasActiveSubscription}
        />
      ) : null}

      {needsRegeneration ? (
        <Banner
          tone="mustard"
          icon={Sparkles}
          title="Tu perfil cambió"
          description="Regenera el plan para que use tu objetivo, equipo y molestias actualizadas."
        >
          <div className="mt-4">
            <Button variant="mustard" href="/generating-plan" className="w-full">
              Regenerar plan
              <ArrowRight size={17} />
            </Button>
          </div>
        </Banner>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Plan"
          value={plan ? `Sem ${plan.currentWeek}/${plan.totalWeeks}` : 'Sin plan'}
          href="/plan"
          icon={ClipboardList}
          tone="cyan"
        />
        <Stat
          label="Progreso"
          value={plan ? `${completedSessions}/${totalSessions}` : `${checkIns.length} checks`}
          href="/progress"
          icon={BarChart3}
          tone="mustard"
        />
      </div>

      <Link href="/checkin?manual=1" className="block">
        <Card className="flex items-center gap-4 transition hover:border-brand-mustard/40">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-mustard/14 text-brand-mustard">
            <PencilLine aria-hidden="true" size={22} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-snug">Registrar algo fuera del plan</p>
            <p className="mt-1 text-sm text-white/58">
              Guarda roca, movilidad o una adaptación manual.
            </p>
          </div>
          <ArrowRight size={18} className="text-white/40" />
        </Card>
      </Link>

      <Link href="/chat" className="block">
        <Card className="flex items-center gap-4 transition hover:border-brand-cyan/40">
          <CharacterAvatar
            character={profile?.character === 'senda' ? 'senda' : 'bill'}
            variant="avatar"
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-snug">¿Dudas? Habla con {characterName}</p>
            <p className="mt-1 text-sm text-white/58">
              Con perfil, plan y check-ins como contexto.
            </p>
          </div>
          <ArrowRight size={18} className="text-white/40" />
        </Card>
      </Link>

      <LastCheckInCard checkIn={latestCheckIn} />
    </motion.section>
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
      <Card variant="hero" className="relative overflow-hidden">
        <MountainBackdrop />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
            <Sparkles size={13} />
            Empieza aquí
          </div>
          <h2 className="mt-4 text-2xl font-extrabold leading-tight">Crea tu primer plan</h2>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Completa el onboarding para generar una periodización adaptada a tu objetivo, equipo,
            energía y contexto físico.
          </p>
          <Button href="/onboarding" size="lg" className="mt-6 w-full">
            Crear mi primer plan
            <ArrowRight size={18} />
          </Button>
        </div>
      </Card>
    );
  }

  if (!todayState || todayState.kind === 'rest') {
    return (
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">Hoy toca</p>
        <h2 className="mt-2 text-2xl font-extrabold">Recuperación</h2>
        <p className="mt-3 text-sm leading-6 text-white/72">
          {todayState?.message ??
            'Estiramiento suave, movilidad y recuperación cuentan como entrenamiento.'}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" href="/checkin?manual=1&adapt=1">
            Adaptar porque hoy no puedo
          </Button>
          <Button variant="secondary" href="/checkin?manual=1">
            Registrar algo fuera del plan
          </Button>
        </div>
      </Card>
    );
  }

  if (todayState.kind === 'plan-completed') {
    return (
      <Card variant="mustard">
        <h2 className="text-2xl font-extrabold">Plan completado</h2>
        <p className="mt-3 text-sm leading-6 text-white/72">{todayState.message}</p>
        <Button href="/progress" size="lg" className="mt-5 w-full">
          Ver progreso
          <ArrowRight size={18} />
        </Button>
      </Card>
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
    <Card variant="hero" className="relative overflow-hidden">
      <MountainBackdrop />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
              <Flame size={13} />
              Hoy toca
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-brand-mustard">
              Día {session.dayNumber} · Semana {week.weekNumber}
            </p>
            <h2 className="mt-1.5 text-2xl font-extrabold leading-tight">{session.title}</h2>
          </div>
          <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/72">
            <TimerReset aria-hidden="true" size={13} />
            ~{session.estimatedMinutes} min
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <SessionFact label="Objetivo" value={getSessionObjective(session)} />
          <SessionFact label="Lugar" value={session.location} />
          <SessionFact label="Intensidad" value={getSessionIntensity(session)} />
          <SessionFact label="Duración" value={`~${session.estimatedMinutes} min`} />
        </div>

        <div className="mt-4">
          <Banner
            tone={riskBannerTone(risk.tone)}
            icon={AlertTriangle}
            title={risk.label}
            description={risk.detail}
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-white/72">{todayState.message}</p>

        <Button href={href} size="lg" className="mt-5 w-full">
          {callToAction}
          <ArrowRight size={18} />
        </Button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            href={`/checkin?manual=1&adapt=1&sessionId=${encodeURIComponent(todayState.sessionId)}`}
            className="border border-white/10"
          >
            Adaptar hoy
          </Button>
          <Button variant="ghost" href="/checkin?manual=1" className="border border-white/10">
            Otra actividad
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SessionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.10em] text-white/42">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-bold leading-snug text-white">{value}</p>
    </div>
  );
}

function LastCheckInCard({ checkIn }: { checkIn: CheckIn | null }) {
  if (!checkIn) {
    return (
      <Card>
        <p className="text-sm font-bold text-white">Aún no hay check-ins</p>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Cuando termines tu primera sesión, el resumen aparecerá aquí.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold text-white">Último check-in</p>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/45">
          {formatRelativeDate(checkIn.date)}
        </p>
      </div>
      {checkIn.manualActivity ? (
        <p className="mt-2 text-sm font-bold text-brand-cyan">{checkIn.manualActivity.title}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Chip>RPE {checkIn.rpe}/10</Chip>
        <Chip>Dedos {checkIn.fingerPain}/10</Chip>
        <Chip>Energía {checkIn.energy}/5</Chip>
      </div>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-white/72">
      {children}
    </span>
  );
}
