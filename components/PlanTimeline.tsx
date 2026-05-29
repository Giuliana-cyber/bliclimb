'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  PlayCircle,
  RefreshCw,
  Target
} from 'lucide-react';
import { ExerciseGuide } from '@/components/ExerciseGuide';
import { loadTrainingPlan, type Exercise, type Session, type TrainingPlan, type Week } from '@/lib/plan';
import { withDerivedCurrentWeek } from '@/lib/training/current-session';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getSessionKey(weekNumber: number, dayNumber: number) {
  return `${weekNumber}-${dayNumber}`;
}

function getSessionObjective(session: Session) {
  const mainExercises = session.mainBlock
    .map((exercise) => exercise.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(' + ');

  return mainExercises || session.title;
}

function getSessionReason(week: Week, session: Session) {
  const focus = week.focusAreas.filter(Boolean).slice(0, 2).join(' + ') || week.theme;

  if (session.source) {
    return `Construye ${focus} con referencia en ${session.source}.`;
  }

  return `Empuja ${focus} dentro del bloque ${week.theme}.`;
}

function getSessionIntensity(session: Session) {
  const intensity = [...session.mainBlock, ...session.warmup, ...session.cooldown]
    .map((exercise) => exercise.intensity)
    .find((value): value is string => Boolean(value));

  return intensity ?? 'Moderada y técnica';
}

function getSessionEquipment(session: Session) {
  const content = [session.location, ...session.warmup, ...session.mainBlock, ...session.cooldown]
    .map((item) => (typeof item === 'string' ? item : `${item.name} ${item.description} ${item.notes ?? ''}`))
    .join(' ')
    .toLowerCase();
  const equipment = [
    ['hangboard', 'hangboard'],
    ['fingerboard', 'fingerboard'],
    ['banda', 'banda elástica'],
    ['mancuerna', 'mancuernas'],
    ['pesas', 'pesas'],
    ['barra', 'barra'],
    ['colchoneta', 'colchoneta'],
    ['roca', 'roca'],
    ['gym', 'muro/gym'],
    ['casa', 'peso corporal']
  ]
    .filter(([term]) => content.includes(term))
    .map(([, label]) => label);
  const uniqueEquipment = Array.from(new Set(equipment));

  if (uniqueEquipment.length > 0) {
    return uniqueEquipment.join(', ');
  }

  return session.location === 'roca' ? 'roca y material personal' : 'sin equipo especial';
}

export function PlanTimeline() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [openWeeks, setOpenWeeks] = useState<number[]>([]);
  const [openSessions, setOpenSessions] = useState<string[]>([]);
  const showDevelopmentSources = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    const storedPlan = loadTrainingPlan();
    const activePlan = storedPlan ? withDerivedCurrentWeek(storedPlan) : null;
    setPlan(activePlan);

    if (activePlan) {
      setOpenWeeks([activePlan.currentWeek]);
    }
  }, []);

  const completedSessions = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.weeks.flatMap((week) => week.sessions).filter((session) => session.completed)
      .length;
  }, [plan]);

  const totalSessions = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.weeks.flatMap((week) => week.sessions).length;
  }, [plan]);

  function toggleWeek(weekNumber: number) {
    setOpenWeeks((current) =>
      current.includes(weekNumber)
        ? current.filter((item) => item !== weekNumber)
        : [...current, weekNumber]
    );
  }

  function toggleSession(weekNumber: number, dayNumber: number) {
    const sessionKey = getSessionKey(weekNumber, dayNumber);
    setOpenSessions((current) =>
      current.includes(sessionKey)
        ? current.filter((item) => item !== sessionKey)
        : [...current, sessionKey]
    );
  }

  if (!plan) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-brand-cyan">Mi Plan</p>
          <h1 className="mt-2 text-3xl font-bold">Plan de entrenamiento</h1>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <div className="grid size-12 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
            <Target aria-hidden="true" size={24} strokeWidth={2.4} />
          </div>
          <h2 className="mt-5 text-2xl font-bold">Aún no tienes un plan activo</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Completa tu perfil para que BilClimb genere una periodización adaptada a tu
            objetivo, días disponibles, equipo y contexto físico.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
          >
            Crear mi primer plan
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand-cyan">Mi Plan</p>
        <h1 className="mt-2 text-3xl font-bold">Plan de {plan.totalWeeks} semanas</h1>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Objetivo: {plan.objective} · Inicio: {formatDate(plan.startDate)}
        </p>
        {plan.usedFileSearch ? (
          <div className="mt-3 inline-flex max-w-full flex-col items-start gap-1 rounded-md border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
              <BookOpenCheck aria-hidden="true" size={14} strokeWidth={2.4} />
              Plan basado en biblioteca BilClimb
            </span>
            {showDevelopmentSources && plan.librarySources?.length ? (
              <span className="text-xs leading-5 text-white/52">
                Fuentes: {plan.librarySources.join(', ')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Semana" value={`${plan.currentWeek}/${plan.totalWeeks}`} />
        <Metric label="Sesiones" value={`${completedSessions}/${totalSessions}`} />
        <Metric label="Estado" value={plan.status} />
      </div>

      <div className="space-y-3">
        {plan.weeks.map((week) => {
          const isOpen = openWeeks.includes(week.weekNumber);
          const isCurrentWeek = week.weekNumber === plan.currentWeek;

          return (
            <article
              key={week.weekNumber}
              className={classNames(
                'overflow-hidden rounded-lg border bg-white/[0.04]',
                isCurrentWeek ? 'border-brand-cyan/40 shadow-glow' : 'border-white/10'
              )}
            >
              <button
                type="button"
                onClick={() => toggleWeek(week.weekNumber)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-brand-mustard">
                      Semana {week.weekNumber}
                    </p>
                    {isCurrentWeek ? (
                      <span className="rounded-md bg-brand-cyan/14 px-2 py-1 text-xs font-bold text-brand-cyan">
                        Actual
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1 truncate text-lg font-bold">{week.theme}</h2>
                  <p className="mt-1 text-sm text-white/52">{week.focusAreas.join(' + ')}</p>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  size={21}
                  className={classNames(
                    'shrink-0 text-white/56 transition',
                    isOpen && 'rotate-180 text-brand-cyan'
                  )}
                />
              </button>

              {isOpen ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="space-y-3">
                    {week.sessions.map((session) => {
                      const sessionKey = getSessionKey(week.weekNumber, session.dayNumber);
                      const isSessionOpen = openSessions.includes(sessionKey);

                      return (
                        <div
                          key={sessionKey}
                          className="rounded-md border border-white/10 bg-brand-dark/38 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white/52">
                                Día {session.dayNumber}
                              </p>
                              <h3 className="mt-1 text-base font-bold">{session.title}</h3>
                            </div>
                            {session.completed ? (
                              <CheckCircle2
                                aria-label="Sesión completada"
                                size={22}
                                className="shrink-0 text-brand-cyan"
                              />
                            ) : (
                              <Circle
                                aria-label="Sesión pendiente"
                                size={21}
                                className="shrink-0 text-white/34"
                              />
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <SessionStrategy label="Objetivo" value={getSessionObjective(session)} />
                            <SessionStrategy label="Por qué existe" value={getSessionReason(week, session)} />
                            <SessionStrategy label="Duración" value={`${session.estimatedMinutes} min`} />
                            <SessionStrategy label="Intensidad" value={getSessionIntensity(session)} />
                            <SessionStrategy label="Equipo" value={getSessionEquipment(session)} />
                            <SessionStrategy label="Lugar" value={session.location} />
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Link
                              href={`/session?week=${week.weekNumber}&day=${session.dayNumber}`}
                              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-cyan px-3 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
                            >
                              <PlayCircle aria-hidden="true" size={17} strokeWidth={2.5} />
                              Empezar sesión
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleSession(week.weekNumber, session.dayNumber)}
                              className="inline-flex items-center justify-center rounded-md border border-white/12 px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/[0.05]"
                              aria-expanded={isSessionOpen}
                            >
                              {isSessionOpen ? 'Ocultar detalles' : 'Ver detalles'}
                            </button>
                          </div>

                          {isSessionOpen ? (
                            <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                              <ExerciseSection
                                title="Calentamiento"
                                sessionTitle={session.title}
                                exercises={session.warmup}
                              />
                              <ExerciseSection
                                title="Bloque principal"
                                sessionTitle={session.title}
                                exercises={session.mainBlock}
                              />
                              <ExerciseSection
                                title="Vuelta a la calma"
                                sessionTitle={session.title}
                                exercises={session.cooldown}
                              />

                              <div className="rounded-md border border-brand-mustard/20 bg-brand-mustard/10 p-3">
                                <p className="text-xs font-bold uppercase text-brand-mustard">
                                  Nutrición post
                                </p>
                                <p className="mt-1 text-sm leading-6 text-white/72">
                                  {session.nutritionTip}
                                </p>
                              </div>

                              {session.source ? (
                                <p className="text-xs font-semibold text-white/42">
                                  Fuente: {session.source}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/generating-plan"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-cyan/40 px-4 py-3 text-sm font-bold text-brand-cyan transition hover:bg-brand-cyan/10"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Regenerar plan
        </Link>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-md border border-white/12 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/[0.05]"
        >
          Editar objetivo
        </Link>
      </div>
    </section>
  );
}

function ExerciseSection({
  title,
  sessionTitle,
  exercises
}: {
  title: string;
  sessionTitle: string;
  exercises: Exercise[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase text-brand-cyan">{title}</h4>
      <div className="space-y-2">
        {exercises.map((exercise) => {
          return (
            <div key={`${title}-${exercise.name}`} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-bold text-white">{exercise.name}</p>
                <ExerciseGuide exercise={exercise} contextLabel={`${title} - ${sessionTitle}`} />
              </div>
              <p className="mt-2 text-sm leading-6 text-white/66">{exercise.description}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/46">
                {exercise.sets ? <span>{exercise.sets} series</span> : null}
                {exercise.reps ? <span>{exercise.reps}</span> : null}
                {exercise.rest ? <span>descanso {exercise.rest}</span> : null}
                {exercise.intensity ? <span>{exercise.intensity}</span> : null}
              </div>

              {exercise.notes ? (
                <p className="mt-2 text-xs leading-5 text-white/52">Nota: {exercise.notes}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionStrategy({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/42">{label}</p>
      <p className="mt-2 text-sm font-bold leading-5 text-white/82">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-semibold text-white/46">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
    </div>
  );
}
