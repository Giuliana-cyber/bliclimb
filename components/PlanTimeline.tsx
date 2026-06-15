'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { Banner } from '@/components/ui/Banner';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import {
  loadTrainingPlan,
  type Exercise,
  type Session,
  type TrainingPlan,
  type Week
} from '@/lib/plan';
import { withDerivedCurrentWeek } from '@/lib/training/current-session';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function sessionKey(weekNumber: number, dayNumber: number) {
  return `${weekNumber}-${dayNumber}`;
}

function getSessionObjective(session: Session) {
  if (session.objective) return session.objective;
  const mainExercises = session.mainBlock
    .map((exercise) => exercise.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(' + ');
  return mainExercises || session.title;
}

function getSessionReason(week: Week, session: Session) {
  if (session.why) return session.why;
  const focus = week.focusAreas.filter(Boolean).slice(0, 2).join(' + ') || week.theme;
  if (session.source) return `Construye ${focus} con referencia en ${session.source}.`;
  return `Empuja ${focus} dentro del bloque ${week.theme}.`;
}

function getSessionIntensity(session: Session) {
  if (session.intensityTarget) return session.intensityTarget;
  const intensity = [...session.mainBlock, ...session.warmup, ...session.cooldown]
    .map((exercise) => exercise.intensity)
    .find((value): value is string => Boolean(value));
  return intensity ?? 'Moderada y técnica';
}

function formatPlanStatus(status: TrainingPlan['status']) {
  const labels: Record<TrainingPlan['status'], string> = {
    active: 'Activo',
    completed: 'Completado',
    paused: 'Pausado'
  };
  return labels[status];
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
    if (activePlan) setOpenWeeks([activePlan.currentWeek]);
  }, []);

  const completedSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).filter((s) => s.completed).length : 0),
    [plan]
  );
  const totalSessions = useMemo(
    () => (plan ? plan.weeks.flatMap((w) => w.sessions).length : 0),
    [plan]
  );

  function toggleWeek(weekNumber: number) {
    setOpenWeeks((current) =>
      current.includes(weekNumber)
        ? current.filter((item) => item !== weekNumber)
        : [...current, weekNumber]
    );
  }

  function toggleSession(weekNumber: number, dayNumber: number) {
    const key = sessionKey(weekNumber, dayNumber);
    setOpenSessions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  if (!plan) {
    return (
      <section className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Mi Plan</p>
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
              Completa tu perfil para que BilClimb genere una periodización adaptada a tu objetivo,
              días disponibles, equipo y contexto físico.
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
          Objetivo: {plan.mainObjective || plan.objective || 'Sin objetivo declarado'} · Inicio:{' '}
          {formatDate(plan.startDate)}
        </p>
        {plan.usedFileSearch ? (
          <div className="inline-flex max-w-full flex-col items-start gap-1 rounded-xl border border-brand-cyan/25 bg-brand-cyan/[0.08] px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
              <BookOpenCheck aria-hidden="true" size={13} strokeWidth={2.4} />
              Plan basado en biblioteca BilClimb
            </span>
            {showDevelopmentSources && plan.librarySources?.length ? (
              <span className="text-xs leading-5 text-white/52">
                Fuentes: {plan.librarySources.join(', ')}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Semana" value={`${plan.currentWeek}/${plan.totalWeeks}`} tone="cyan" />
        <Stat label="Sesiones" value={`${completedSessions}/${totalSessions}`} tone="mustard" />
        <Stat label="Estado" value={formatPlanStatus(plan.status)} tone="cyan" />
      </div>

      <PlanDetailsAccordion plan={plan} />

      <div className="space-y-3">
        {plan.weeks.map((week) => {
          const isOpen = openWeeks.includes(week.weekNumber);
          const isCurrentWeek = week.weekNumber === plan.currentWeek;
          return (
            <Card
              key={week.weekNumber}
              variant={isCurrentWeek ? 'hero' : 'default'}
              className="overflow-hidden p-0"
            >
              <button
                type="button"
                onClick={() => toggleWeek(week.weekNumber)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.10em] text-brand-mustard">
                      Semana {week.weekNumber}
                    </p>
                    {isCurrentWeek ? (
                      <span className="rounded-full bg-brand-cyan/15 px-2.5 py-0.5 text-xs font-bold text-brand-cyan">
                        Actual
                      </span>
                    ) : null}
                    {week.deloadWeek ? (
                      <span className="rounded-full bg-brand-mustard/15 px-2.5 py-0.5 text-xs font-bold text-brand-mustard">
                        Descarga
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1 truncate text-lg font-extrabold">{week.theme}</h2>
                  {week.focusAreas.length ? (
                    <p className="mt-0.5 text-sm text-white/56">
                      {week.focusAreas.join(' + ')}
                    </p>
                  ) : null}
                  {week.objective || week.progressionFocus || week.loadLevel ? (
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      {[week.objective, week.progressionFocus, week.loadLevel && `Carga: ${week.loadLevel}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
                <ChevronDown
                  aria-hidden="true"
                  size={20}
                  className={cn(
                    'mt-1 shrink-0 text-white/56 transition',
                    isOpen && 'rotate-180 text-brand-cyan'
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-white/[0.06] px-5 py-4">
                      {week.sessions.map((session) => {
                        const key = sessionKey(week.weekNumber, session.dayNumber);
                        const isSessionOpen = openSessions.includes(key);
                        return (
                          <div
                            key={key}
                            className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.10em] text-white/50">
                                  Día {session.dayNumber}
                                </p>
                                <h3 className="mt-1 text-base font-extrabold leading-tight">
                                  {session.title}
                                </h3>
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
                                  className="shrink-0 text-white/30"
                                />
                              )}
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <Pair label="Objetivo" value={getSessionObjective(session)} />
                              <Pair label="Por qué" value={getSessionReason(week, session)} />
                              <Pair
                                label="Duración"
                                value={`${session.estimatedMinutes} min`}
                              />
                              <Pair label="Intensidad" value={getSessionIntensity(session)} />
                              <Pair label="Lugar" value={session.location} />
                              {session.stimulusType ? (
                                <Pair label="Estímulo" value={session.stimulusType} />
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              <Button
                                href={`/session?week=${week.weekNumber}&day=${session.dayNumber}`}
                                icon={<PlayCircle size={17} />}
                              >
                                Empezar sesión
                              </Button>
                              <button
                                type="button"
                                onClick={() => toggleSession(week.weekNumber, session.dayNumber)}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 px-3 text-sm font-bold text-white/78 transition hover:bg-white/[0.05]"
                                aria-expanded={isSessionOpen}
                              >
                                {isSessionOpen ? 'Ocultar detalles' : 'Ver detalles'}
                              </button>
                            </div>

                            <AnimatePresence initial={false}>
                              {isSessionOpen ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.25,
                                    ease: [0.22, 1, 0.36, 1]
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                                    <ExerciseSection
                                      title="Calentamiento general"
                                      sessionTitle={session.title}
                                      exercises={
                                        session.warmupGeneral?.length
                                          ? session.warmupGeneral
                                          : session.warmup
                                      }
                                    />
                                    {session.warmupSpecific?.length ? (
                                      <ExerciseSection
                                        title="Calentamiento específico"
                                        sessionTitle={session.title}
                                        exercises={session.warmupSpecific}
                                      />
                                    ) : null}
                                    <ExerciseSection
                                      title="Parte principal"
                                      sessionTitle={session.title}
                                      exercises={session.mainBlock}
                                    />
                                    {session.finalBlock?.length ? (
                                      <ExerciseSection
                                        title="Parte final"
                                        sessionTitle={session.title}
                                        exercises={session.finalBlock}
                                      />
                                    ) : null}
                                    <ExerciseSection
                                      title="Vuelta a la calma"
                                      sessionTitle={session.title}
                                      exercises={session.cooldown}
                                    />

                                    <SessionRules
                                      safetyNotes={session.safetyNotes}
                                      adjustmentRules={session.adjustmentRules}
                                      successCriteria={session.successCriteria}
                                    />

                                    {session.nutritionTip ? (
                                      <Banner
                                        tone="mustard"
                                        title="Nutrición post"
                                        description={session.nutritionTip}
                                      />
                                    ) : null}

                                    {session.source ? (
                                      <p className="text-xs font-bold text-white/45">
                                        Fuente: {session.source}
                                      </p>
                                    ) : null}
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" href="/generating-plan" icon={<RefreshCw size={17} />}>
          Regenerar plan
        </Button>
        <Button variant="secondary" href="/profile">
          Editar objetivo
        </Button>
      </div>
    </motion.section>
  );
}

function PlanDetailsAccordion({ plan }: { plan: TrainingPlan }) {
  const [open, setOpen] = useState(false);
  const hasAny = Boolean(
    plan.athleteSummary ||
      plan.riskSummary ||
      plan.recoveryGuidelines?.length ||
      plan.progressionModel ||
      plan.planningRationale ||
      plan.qualityScores
  );

  if (!hasAny) return null;

  return (
    <Card className="!p-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <span className="text-sm font-extrabold text-white/85">
          Detalles del plan{' '}
          <span className="text-white/45">— atleta, riesgo, progresión</span>
        </span>
        <ChevronDown
          size={18}
          className={cn('text-white/60 transition', open && 'rotate-180 text-brand-cyan')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 border-t border-white/[0.06] p-5 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-2.5">
              {plan.athleteSummary ? (
                <InfoCard label="Atleta" value={plan.athleteSummary} />
              ) : null}
              {plan.riskSummary ? <InfoCard label="Riesgo" value={plan.riskSummary} /> : null}
              {plan.recoveryGuidelines?.length ? (
                <InfoCard label="Recuperación" value={plan.recoveryGuidelines.join(' · ')} />
              ) : null}
              {plan.progressionModel ? (
                <InfoCard label="Progresión" value={plan.progressionModel} />
              ) : null}
              {plan.planningRationale ? (
                <InfoCard label="Razonamiento" value={plan.planningRationale} />
              ) : null}
              {plan.qualityScores ? (
                <InfoCard
                  label="Calidad"
                  value={`Variación ${plan.qualityScores.variationScore}/100 · Progresión ${plan.qualityScores.progressionScore}/100 · Seguridad ${plan.qualityScores.safetyScore}/100`}
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.10em] text-white/45">{label}</p>
      <p className="mt-1.5 text-sm font-bold leading-snug text-white/86">{value}</p>
    </div>
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
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
        {title}
      </h4>
      <div className="space-y-2">
        {exercises.map((exercise) => (
          <div
            key={`${title}-${exercise.name}`}
            className="rounded-xl border border-white/8 bg-white/[0.025] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm font-extrabold text-white">{exercise.name}</p>
              <ExerciseGuide exercise={exercise} contextLabel={`${title} - ${sessionTitle}`} />
            </div>
            <p className="mt-2 text-sm leading-6 text-white/66">{exercise.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/45">
              {exercise.category ? <span>Categoría: {exercise.category}</span> : null}
              {exercise.prescription ? <span>{exercise.prescription}</span> : null}
              {exercise.sets ? <span>{exercise.sets} series</span> : null}
              {exercise.reps ? <span>{exercise.reps}</span> : null}
              {exercise.duration ? <span>{exercise.duration}</span> : null}
              {exercise.rest ? <span>descanso {exercise.rest}</span> : null}
              {exercise.intensity ? <span>{exercise.intensity}</span> : null}
              {exercise.intensityPercent ? <span>{exercise.intensityPercent}</span> : null}
              {exercise.rpeTarget ? <span>{exercise.rpeTarget}</span> : null}
            </div>
            {exercise.notes ? (
              <p className="mt-2 text-xs leading-5 text-white/55">Nota: {exercise.notes}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionRules({
  safetyNotes,
  adjustmentRules,
  successCriteria
}: {
  safetyNotes?: string[] | null;
  adjustmentRules?: string[] | null;
  successCriteria?: string[] | null;
}) {
  const groups = [
    { title: 'Seguridad', items: safetyNotes, tone: 'danger' as const },
    { title: 'Ajuste', items: adjustmentRules, tone: 'mustard' as const },
    { title: 'Éxito', items: successCriteria, tone: 'cyan' as const }
  ].filter((group) => group.items?.length);

  if (!groups.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map((group) => (
        <Banner key={group.title} tone={group.tone} title={group.title}>
          <ul className="mt-2 space-y-1.5">
            {group.items?.map((item) => (
              <li key={item} className="text-xs leading-5 text-white/65">
                · {item}
              </li>
            ))}
          </ul>
        </Banner>
      ))}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-card p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.10em] text-white/45">{label}</p>
      <p className="mt-2 line-clamp-4 text-sm leading-5 text-white/72">{value}</p>
    </div>
  );
}
