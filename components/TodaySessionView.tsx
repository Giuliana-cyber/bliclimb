'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock3, MapPin } from 'lucide-react';
import { ExerciseBlock } from '@/components/ExerciseBlock';
import { loadTrainingPlan } from '@/lib/plan';
import type { Exercise } from '@/lib/plan';
import type { Session } from '@/lib/plan';
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
    if (!sessionContext) {
      return 0;
    }

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
    if (!sessionContext) {
      return;
    }

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
        <Link href="/plan" className="inline-flex items-center gap-2 text-sm font-semibold text-white/62">
          <ChevronLeft aria-hidden="true" size={17} />
          Volver al plan
        </Link>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-2xl font-bold">No hay sesión para mostrar</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Genera un plan para que BilClimb pueda mostrarte la sesión correspondiente.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark"
          >
            Crear mi plan
          </Link>
        </div>
      </section>
    );
  }

  const { week, session } = sessionContext;

  return (
    <section className="space-y-6">
      <Link href="/plan" className="inline-flex items-center gap-2 text-sm font-semibold text-white/62">
        <ChevronLeft aria-hidden="true" size={17} />
        Volver al plan
      </Link>

      <div>
        <p className="text-sm font-semibold text-brand-mustard">
          Día {session.dayNumber} · Semana {week.weekNumber}
        </p>
        <h1 className="mt-2 text-3xl font-bold uppercase leading-tight">{session.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/62">
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" size={16} />
            ~{session.estimatedMinutes} min
          </span>
          <span className="inline-flex items-center gap-1 text-brand-cyan">
            Restante: ~{remainingMinutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" size={16} />
            {session.location}
          </span>
        </div>
      </div>

      {week.objective || week.progressionFocus || week.loadLevel || session.stimulusType ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {week.objective ? <SessionInfo label="Microciclo" value={week.objective} /> : null}
          {week.progressionFocus ? (
            <SessionInfo label="Progresión" value={week.progressionFocus} />
          ) : null}
          {week.loadLevel ? <SessionInfo label="Carga" value={week.loadLevel} /> : null}
          {session.stimulusType ? <SessionInfo label="Estímulo" value={session.stimulusType} /> : null}
        </div>
      ) : null}

      {session.objective || session.why || session.intensityTarget ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {session.objective ? <SessionInfo label="Objetivo" value={session.objective} /> : null}
          {session.why ? <SessionInfo label="Por qué" value={session.why} /> : null}
          {session.intensityTarget ? (
            <SessionInfo label="Intensidad" value={session.intensityTarget} />
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white/74">Progreso de sesión</p>
          <p className="text-sm font-bold text-brand-cyan">
            {completedCount}/{totalExercises}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand-cyan transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

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

      <div className="rounded-lg border border-brand-mustard/24 bg-brand-mustard/10 p-4">
        <p className="text-sm font-bold text-brand-mustard">Nutrición post</p>
        <p className="mt-2 text-sm leading-6 text-white/74">{session.nutritionTip}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allExercisesComplete ? (
          <Link
            href={`/checkin?week=${week.weekNumber}&day=${session.dayNumber}&sessionId=${encodeURIComponent(sessionContext.sessionId)}`}
            className="flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
          >
            Finalizar sesión y hacer check-in
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center rounded-md bg-white/10 px-4 py-4 text-base font-bold text-white/38"
          >
            Completa ejercicios para finalizar
          </button>
        )}
        <Link
          href="/plan"
          className="flex w-full items-center justify-center rounded-md border border-white/12 px-4 py-4 text-base font-bold text-white/76 transition hover:bg-white/[0.05]"
        >
          Volver al plan
        </Link>
      </div>
    </section>
  );
}

function getSessionSections(session: Session) {
  const hasProfessionalWarmup = Boolean(session.warmupGeneral?.length || session.warmupSpecific?.length);

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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-cyan">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/72">{value}</p>
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
    { title: 'Seguridad', items: safetyNotes },
    { title: 'Ajusta si', items: adjustmentRules },
    { title: 'Bien hecho si', items: successCriteria }
  ].filter((card) => card.items?.length);

  if (!cards.length) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <section key={card.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-bold text-brand-cyan">{card.title}</h2>
          <ul className="mt-3 space-y-2">
            {card.items?.map((item) => (
              <li key={item} className="text-sm leading-6 text-white/66">
                {item}
              </li>
            ))}
          </ul>
        </section>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold uppercase">{title}</h2>
        <span className="text-sm font-semibold text-white/46">{minutesLabel}</span>
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
