'use client';

import { Check } from 'lucide-react';
import type { Exercise } from '@/lib/plan';
import { ExerciseGuide } from '@/components/ExerciseGuide';
import { Timer } from '@/components/Timer';
import { getExerciseTimerConfig } from '@/lib/training/exercise-timer';

type ExerciseBlockProps = {
  exercise: Exercise;
  complete: boolean;
  onToggle: () => void;
};

export function ExerciseBlock({ exercise, complete, onToggle }: ExerciseBlockProps) {
  const timer = getExerciseTimerConfig(exercise);

  return (
    <article
      className={[
        'rounded-lg border p-4 transition',
        complete ? 'border-brand-cyan/40 bg-brand-cyan/10' : 'border-white/10 bg-white/[0.04]'
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={complete}
            aria-label={complete ? 'Desmarcar ejercicio' : 'Marcar ejercicio'}
            title={complete ? 'Desmarcar' : 'Marcar'}
            className={[
              'mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border transition',
              complete
                ? 'border-brand-cyan bg-brand-cyan text-brand-dark'
                : 'border-white/44 bg-brand-dark/60 text-transparent hover:border-brand-cyan/60'
            ].join(' ')}
          >
            <Check aria-hidden="true" size={15} strokeWidth={3} />
          </button>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">{exercise.name}</span>
          <span className="mt-1 block text-sm leading-6 text-white/64">
            {exercise.description}
          </span>
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ExerciseMetric label="Series" value={exercise.sets ? String(exercise.sets) : null} />
        <ExerciseMetric label="Repeticiones" value={exercise.reps} />
        <ExerciseMetric label="Descanso" value={exercise.rest} />
        <ExerciseMetric label="Intensidad" value={exercise.intensity} />
      </dl>

      {exercise.notes ? (
        <div className="mt-4 rounded-md border border-brand-mustard/20 bg-brand-mustard/10 p-3">
          <p className="text-xs font-semibold text-brand-mustard">Nota</p>
          <p className="mt-1 text-sm leading-6 text-white/72">{exercise.notes}</p>
        </div>
      ) : null}

      {timer ? (
        <div className="mt-4">
          <Timer initialSeconds={timer.seconds} label={timer.label} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={[
            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-bold transition',
            complete
              ? 'bg-brand-cyan text-brand-dark'
              : 'border border-white/12 text-white/68 hover:bg-white/[0.05] hover:text-white'
          ].join(' ')}
        >
          <Check aria-hidden="true" size={15} strokeWidth={2.8} />
          {complete ? 'Hecho' : 'Marcar hecho'}
        </button>
        <ExerciseGuide exercise={exercise} contextLabel="Sesión de hoy" />
      </div>
    </article>
  );
}

function ExerciseMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-brand-dark/42 p-2">
      <dt className="font-semibold text-white/42">{label}</dt>
      <dd className="mt-1 min-h-4 font-bold text-white/82">{value ?? '-'}</dd>
    </div>
  );
}
