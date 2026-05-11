import type { Exercise } from '@/lib/plan';

function parseDurationSeconds(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.toLowerCase().replace(',', '.');
  const rangeMatch = normalizedValue.match(
    /(\d+(?:\.\d+)?)\s*(?:-|a)\s*(\d+(?:\.\d+)?)\s*(seg|segundos|sec|s|min|mins|minutos)\b/
  );
  const singleMatch = normalizedValue.match(
    /(\d+(?:\.\d+)?)\s*(seg|segundos|sec|s|min|mins|minutos)\b/
  );
  const match = rangeMatch ?? singleMatch;

  if (!match) {
    return null;
  }

  const amount = Number(rangeMatch ? match[2] : match[1]);
  const unit = match[3] ?? match[2];

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const seconds = unit.startsWith('min') ? amount * 60 : amount;

  return Math.min(30 * 60, Math.max(1, Math.round(seconds)));
}

export function getExerciseTimerConfig(exercise: Exercise) {
  if (exercise.timerSeconds && exercise.timerSeconds > 0) {
    return {
      label: exercise.name,
      seconds: exercise.timerSeconds
    };
  }

  const workSeconds = parseDurationSeconds(exercise.reps);

  if (workSeconds) {
    return {
      label: 'Tiempo de trabajo',
      seconds: workSeconds
    };
  }

  const restSeconds = parseDurationSeconds(exercise.rest);

  if (restSeconds) {
    return {
      label: 'Descanso',
      seconds: restSeconds
    };
  }

  return null;
}

export function formatTimerSeconds(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
