'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock3, MapPin } from 'lucide-react';
import { ExerciseBlock } from '@/components/ExerciseBlock';
import { loadTrainingPlan } from '@/lib/plan';
import type { Exercise } from '@/lib/plan';
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

    const { session } = sessionContext;
    return session.warmup.length + session.mainBlock.length + session.cooldown.length;
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

      <ExerciseChecklist
        title="Calentamiento"
        minutesLabel="15 min"
        section="warmup"
        exercises={session.warmup}
        completedExercises={completedExercises}
        onToggle={toggleExercise}
      />

      <ExerciseChecklist
        title="Bloque principal"
        minutesLabel={`${Math.max(session.estimatedMinutes - 25, 20)} min`}
        section="main"
        exercises={session.mainBlock}
        completedExercises={completedExercises}
        onToggle={toggleExercise}
      />

      <ExerciseChecklist
        title="Vuelta a la calma"
        minutesLabel="10 min"
        section="cooldown"
        exercises={session.cooldown}
        completedExercises={completedExercises}
        onToggle={toggleExercise}
      />

      <div className="rounded-lg border border-brand-mustard/24 bg-brand-mustard/10 p-4">
        <p className="text-sm font-bold text-brand-mustard">Nutrición post</p>
        <p className="mt-2 text-sm leading-6 text-white/74">{session.nutritionTip}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allExercisesComplete ? (
          <Link
            href={`/checkin?sessionId=${encodeURIComponent(sessionContext.sessionId)}`}
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
