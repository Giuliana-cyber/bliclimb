import { readStorage, writeStorage } from '@/lib/storage';

function progressStorageKey(sessionId: string) {
  return `bilclimb:session-progress:${sessionId}`;
}

export function getExerciseProgressKey(section: string, index: number) {
  return `${section}-${index}`;
}

export function loadSessionProgress(sessionId: string) {
  const parsedValue = readStorage<string[]>(progressStorageKey(sessionId), []);
  return Array.isArray(parsedValue) ? parsedValue : [];
}

export function saveSessionProgress(sessionId: string, completedExercises: string[]) {
  writeStorage(progressStorageKey(sessionId), completedExercises);
  return completedExercises;
}
