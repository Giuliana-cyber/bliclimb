'use client';

import { Check } from 'lucide-react';
import type { Exercise } from '@/lib/plan';
import { ExerciseHelpLink } from '@/components/ExerciseHelpLink';
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
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
        aria-pressed={complete}
      >
        <span
          className={[
            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border transition',
            complete
              ? 'border-brand-cyan bg-brand-cyan text-brand-dark'
              : 'border-white/24 text-transparent'
          ].join(' ')}
        >
          <Check aria-hidden="true" size={15} strokeWidth={3} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">{exercise.name}</span>
          <span className="mt-1 block text-sm leading-6 text-white/64">
            {exercise.description}
          </span>
        </span>
      </button>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ExerciseMetric label="Series" value={exercise.sets ? String(exercise.sets) : null} />
        <ExerciseMetric label="Reps" value={exercise.reps} />
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

      <div className="mt-3 flex justify-end">
        <ExerciseHelpLink exercise={exercise} contextLabel="Sesion de hoy" />
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
