'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, MessageCircleQuestion, X } from 'lucide-react';
import type { Exercise } from '@/lib/plan';
import { buildExerciseQuestion } from '@/components/ExerciseHelpLink';

type ExerciseGuideProps = {
  exercise: Exercise;
  contextLabel?: string;
};

export function ExerciseGuide({ exercise, contextLabel }: ExerciseGuideProps) {
  const [open, setOpen] = useState(false);
  const params = new URLSearchParams({
    character: 'senda',
    ask: buildExerciseQuestion(exercise, contextLabel)
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-brand-cyan/24 px-2.5 py-2 text-xs font-bold text-brand-cyan transition hover:bg-brand-cyan/10"
        aria-label={`Abrir guía de ${exercise.name}`}
        title="Guía"
      >
        <BookOpen aria-hidden="true" size={15} />
        Guía
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/64 p-3 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Guía de ${exercise.name}`}
        >
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-lg border border-white/10 bg-brand-dark p-4 shadow-2xl sm:max-w-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-cyan">Guía de ejercicio</p>
                <h2 className="mt-1 text-2xl font-bold">{exercise.name}</h2>
                {contextLabel ? (
                  <p className="mt-1 text-xs font-semibold text-white/46">{contextLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-white/12 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar guía"
                title="Cerrar"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <GuideSection title="Qué vas a trabajar">{exercise.description}</GuideSection>

              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <GuideMetric label="Series" value={exercise.sets ? String(exercise.sets) : null} />
                <GuideMetric label="Reps/tiempo" value={exercise.reps} />
                <GuideMetric label="Descanso" value={exercise.rest} />
                <GuideMetric label="Intensidad" value={exercise.intensity} />
              </div>

              {exercise.notes ? <GuideSection title="Cue técnico">{exercise.notes}</GuideSection> : null}

              <GuideSection title="Cómo ejecutarlo">
                Empieza suave, revisa que el movimiento no genere dolor agudo y mantén respiración
                constante. Si la técnica se rompe, baja intensidad, aumenta descanso o detén el
                bloque.
              </GuideSection>

              <Link
                href={`/chat?${params.toString()}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
                onClick={() => setOpen(false)}
              >
                <MessageCircleQuestion aria-hidden="true" size={17} />
                Preguntar a Senda
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <h3 className="text-xs font-bold uppercase text-brand-mustard">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/74">{children}</p>
    </section>
  );
}

function GuideMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
      <p className="text-xs font-semibold text-white/42">{label}</p>
      <p className="mt-1 text-sm font-bold text-white/82">{value ?? '-'}</p>
    </div>
  );
}
