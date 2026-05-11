import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import type { Exercise } from '@/lib/plan';

function buildExerciseQuestion(exercise: Exercise, contextLabel?: string) {
  const details = [
    `Ejercicio: ${exercise.name}`,
    `Descripcion del plan: ${exercise.description}`,
    exercise.sets ? `Series: ${exercise.sets}` : null,
    exercise.reps ? `Reps/tiempo: ${exercise.reps}` : null,
    exercise.rest ? `Descanso: ${exercise.rest}` : null,
    exercise.intensity ? `Intensidad: ${exercise.intensity}` : null,
    exercise.notes ? `Notas del plan: ${exercise.notes}` : null,
    contextLabel ? `Contexto: ${contextLabel}` : null
  ].filter(Boolean);

  return `Senda, explicame como hacer este ejercicio paso a paso y de forma segura.

${details.join('\n')}

Incluye:
- preparacion y posicion inicial
- ejecucion paso a paso
- errores comunes
- como saber si lo estoy haciendo bien
- senales para bajar intensidad o parar
- una alternativa si no tengo el equipo o no tengo climbing gym`;
}

export function ExerciseHelpLink({
  exercise,
  contextLabel
}: {
  exercise: Exercise;
  contextLabel?: string;
}) {
  const params = new URLSearchParams({
    character: 'senda',
    ask: buildExerciseQuestion(exercise, contextLabel)
  });

  return (
    <Link
      href={`/chat?${params.toString()}`}
      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-brand-cyan/24 px-2.5 py-2 text-xs font-bold text-brand-cyan transition hover:bg-brand-cyan/10"
      aria-label={`Preguntar a Senda cómo hacer ${exercise.name}`}
      title="Preguntar a Senda"
    >
      <MessageCircleQuestion aria-hidden="true" size={15} />
      Cómo hacerlo
    </Link>
  );
}
