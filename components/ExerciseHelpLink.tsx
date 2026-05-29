import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import type { Exercise } from '@/lib/plan';

export function buildExerciseQuestion(exercise: Exercise, contextLabel?: string) {
  const context = [
    contextLabel,
    exercise.equipment ? `equipo: ${exercise.equipment}` : null,
    exercise.reps ? `reps/tiempo: ${exercise.reps}` : null,
    exercise.rest ? `descanso: ${exercise.rest}` : null,
    exercise.intensity ? `intensidad: ${exercise.intensity}` : null
  ].filter(Boolean);

  return `Senda, explícame cómo hacer ${exercise.name} en pasos simples. Mi contexto: ${
    context.join(' · ') || 'no especificado'
  }. Incluye errores comunes, qué debo sentir y cuándo parar.`;
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
