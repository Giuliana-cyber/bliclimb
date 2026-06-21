'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Flame,
  MapPin,
  Sparkles
} from 'lucide-react';
import { ExerciseBlock } from '@/components/ExerciseBlock';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { loadTrainingPlan } from '@/lib/plan';
import type { Exercise, Session } from '@/lib/plan';
import {
  getExerciseProgressKey,
  loadSessionProgress,
  saveSessionProgress
} from '@/lib/session-progress';
import {
  getSessionWithContext,
  getTodaySession,
  withDerivedCurrentWeek,
  type SessionWithContext
} from '@/lib/training/current-session';

export function TodaySessionView() {
  const [sessionContext, setSessionContext] = useState<SessionWithContext | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const storedPlan = loadTrainingPlan();
    const plan = storedPlan ? withDerivedCurrentWeek(storedPlan) : null;
    const params = new URLSearchParams(window.location.search);
    const weekNumber = Number(params.get('week'));
    const dayNumber = Number(params.get('day'));
    const selectedSession =
      plan && Number.isInteger(weekNumber) && Number.isInteger(dayNumber)
        ? getSessionWithContext(plan, weekNumber, dayNumber)
        : null;
    const activeSession = selectedSession ?? (plan ? getTodaySession(plan) : null);

    setSessionContext(activeSession);

    if (activeSession) {
      setCompletedExercises(loadSessionProgress(activeSession.sessionId));
    }
  }, []);

  const totalExercises = useMemo(() => {
    if (!sessionContext) return 0;
    return getSessionSections(sessionContext.session).reduce(
      (total, section) => total + section.exercises.length,
      0
    );
  }, [sessionContext]);

  const completedCount = Math.min(completedExercises.length, totalExercises);
  const progress = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const remainingMinutes =
    sessionContext && totalExercises > 0
      ? Math.max(
          0,
          Math.ceil(
            sessionContext.session.estimatedMinutes *
              ((totalExercises - completedCount) / totalExercises)
          )
        )
      : 0;
  const allExercisesComplete = totalExercises > 0 && completedCount >= totalExercises;

  function toggleExercise(key: string) {
    if (!sessionContext) return;
    setCompletedExercises((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      saveSessionProgress(sessionContext.sessionId, next);
      return next;
    });
  }

  if (!sessionContext) {
    return (
      <section className="space-y-6">
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 text-sm font-bold text-white/62 hover:text-white"
        >
          <ChevronLeft aria-hidden="true" size={17} />
          Volver al plan
        </Link>
        <Card variant="hero" className="relative overflow-hidden">
          <MountainBackdrop />
          <div className="relative">
            <h1 className="text-2xl font-extrabold">No hay sesión para mostrar</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Genera un plan para que BilClimb pueda mostrarte la sesión correspondiente.
            </p>
            <Button href="/onboarding" size="lg" className="mt-5 w-full">
              Crear mi plan
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const { week, session } = sessionContext;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <Link
        href="/plan"
        className="inline-flex items-center gap-2 text-sm font-bold text-white/62 hover:text-white"
      >
        <ChevronLeft aria-hidden="true" size={17} />
        Volver al plan
      </Link>

      <Card variant="hero" className="relative overflow-hidden">
        <MountainBackdrop />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
            <Flame size={13} />
            Día {session.dayNumber} · Semana {week.weekNumber}
          </div>
          <h1 className="mt-3 text-[1.8rem] font-extrabold leading-tight">{session.title}</h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <MetaChip icon={Clock3} text={`~${session.estimatedMinutes} min`} />
            <MetaChip
              icon={Sparkles}
              text={`Restante ~${remainingMinutes} min`}
              tone="cyan"
            />
            <MetaChip icon={MapPin} text={session.location} />
          </div>

          {(week.objective || session.objective || session.why) ? (
            <p className="mt-4 text-sm leading-6 text-white/72">
              {session.objective || week.objective}
              {session.why ? ` · ${session.why}` : ''}
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-white">Progreso de sesión</p>
          <p className="text-sm font-extrabold text-brand-cyan">
            {completedCount}<span className="text-white/40">/{totalExercises}</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-cyan shadow-glow"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </Card>

      {(week.objective || week.progressionFocus || week.loadLevel || session.stimulusType) ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {week.objective ? <SessionInfo label="Microciclo" value={week.objective} /> : null}
          {week.progressionFocus ? (
            <SessionInfo label="Progresión" value={week.progressionFocus} />
          ) : null}
          {week.loadLevel ? <SessionInfo label="Carga" value={week.loadLevel} /> : null}
          {session.stimulusType ? (
            <SessionInfo label="Estímulo" value={session.stimulusType} />
          ) : null}
          {session.intensityTarget ? (
            <SessionInfo label="Intensidad" value={session.intensityTarget} />
          ) : null}
        </div>
      ) : null}

      {getSessionSections(session).map((section) => (
        <ExerciseChecklist
          key={section.key}
          title={section.title}
          minutesLabel={section.minutesLabel}
          section={section.key}
          exercises={section.exercises}
          completedExercises={completedExercises}
          onToggle={toggleExercise}
        />
      ))}

      <SessionRuleCards
        safetyNotes={session.safetyNotes}
        adjustmentRules={session.adjustmentRules}
        successCriteria={session.successCriteria}
      />

      {session.nutritionTip ? (
        <Banner tone="mustard" icon={Sparkles} title="Nutrición post" description={session.nutritionTip} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {allExercisesComplete ? (
          <Button
            disabled={finishing}
            onClick={async () => {
              setFinishing(true);
              const target = `/checkin?week=${week.weekNumber}&day=${session.dayNumber}&sessionId=${encodeURIComponent(sessionContext.sessionId)}`;
              // Marcamos la sesión completa server-side antes de navegar.
              // El endpoint también dispara recordDailyActivity y devuelve
              // info de milestone que la UI podría mostrar a futuro. Si la
              // llamada falla (red, sesión vencida) seguimos al check-in
              // de todas formas — no queremos bloquear al usuario.
              try {
                await fetch(
                  `/api/sessions/${encodeURIComponent(sessionContext.sessionId)}/complete`,
                  { method: 'POST' }
                );
              } catch {
                // ignore
              }
              window.location.href = target;
            }}
            size="lg"
            icon={<CheckCircle2 size={18} />}
            className="w-full"
          >
            Finalizar y check-in
          </Button>
        ) : (
          <Button disabled size="lg" className="w-full">
            Completa ejercicios para finalizar
          </Button>
        )}
        <Button variant="secondary" href="/plan" size="lg" className="w-full">
          Volver al plan
        </Button>
      </div>
    </motion.section>
  );
}

function MetaChip({
  icon: Icon,
  text,
  tone = 'neutral'
}: {
  icon: typeof Clock3;
  text: string;
  tone?: 'neutral' | 'cyan';
}) {
  const classes =
    tone === 'cyan'
      ? 'border-brand-cyan/30 bg-brand-cyan/[0.08] text-brand-cyan'
      : 'border-white/10 bg-white/[0.04] text-white/76';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${classes}`}
    >
      <Icon aria-hidden="true" size={13} />
      {text}
    </span>
  );
}

function getSessionSections(session: Session) {
  const hasProfessionalWarmup = Boolean(
    session.warmupGeneral?.length || session.warmupSpecific?.length
  );

  return [
    {
      key: 'warmup-general',
      title: 'Calentamiento general',
      minutesLabel: '8-10 min',
      exercises: hasProfessionalWarmup ? session.warmupGeneral ?? [] : session.warmup
    },
    {
      key: 'warmup-specific',
      title: 'Calentamiento específico',
      minutesLabel: '6-10 min',
      exercises: session.warmupSpecific ?? []
    },
    {
      key: 'main',
      title: 'Parte principal',
      minutesLabel: `${Math.max(session.estimatedMinutes - 30, 20)} min`,
      exercises: session.mainBlock
    },
    {
      key: 'final',
      title: 'Parte final',
      minutesLabel: '8-15 min',
      exercises: session.finalBlock ?? []
    },
    {
      key: 'cooldown',
      title: 'Vuelta a la calma',
      minutesLabel: '8-10 min',
      exercises: session.cooldown
    }
  ].filter((section) => section.exercises.length > 0);
}

function SessionInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.10em] text-brand-cyan">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-white/80">{value}</p>
    </div>
  );
}

function SessionRuleCards({
  safetyNotes,
  adjustmentRules,
  successCriteria
}: {
  safetyNotes?: string[] | null;
  adjustmentRules?: string[] | null;
  successCriteria?: string[] | null;
}) {
  const cards = [
    { title: 'Seguridad', items: safetyNotes, tone: 'danger' as const },
    { title: 'Ajusta si', items: adjustmentRules, tone: 'mustard' as const },
    { title: 'Bien hecho si', items: successCriteria, tone: 'cyan' as const }
  ].filter((card) => card.items?.length);

  if (!cards.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Banner key={card.title} tone={card.tone} title={card.title}>
          <ul className="mt-2 space-y-1.5">
            {card.items?.map((item) => (
              <li key={item} className="text-sm leading-6 text-white/72">
                · {item}
              </li>
            ))}
          </ul>
        </Banner>
      ))}
    </div>
  );
}

function ExerciseChecklist({
  title,
  minutesLabel,
  section,
  exercises,
  completedExercises,
  onToggle
}: {
  title: string;
  minutesLabel: string;
  section: string;
  exercises: Exercise[];
  completedExercises: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold uppercase tracking-[0.06em]">{title}</h2>
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/45">
          {minutesLabel}
        </span>
      </div>
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const key = getExerciseProgressKey(section, index);
          const complete = completedExercises.includes(key);
          return (
            <ExerciseBlock
              key={key}
              exercise={exercise}
              complete={complete}
              onToggle={() => onToggle(key)}
            />
          );
        })}
      </div>
    </section>
  );
}
