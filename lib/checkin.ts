import { readStorage, writeStorage } from '@/lib/storage';

const CHECKINS_STORAGE_KEY = 'bilclimb:checkins';

export interface CheckIn {
  id: string;
  sessionId: string;
  planId: string;
  date: string;
  completed: 'full' | 'partial' | 'skipped';
  rpe: number; // 1-10
  fingerPain: number; // 0-10
  otherPain: string[]; // ['elbows', 'shoulders', ...]
  energy: number; // 1-5
  sleep: number; // 1-5
  notes: string;
  manualActivity: ManualActivity | null;
}

export interface ManualActivity {
  title: string;
  location: string;
  durationMinutes: number | null;
  details: string;
  customizedPlan: boolean;
}

export function loadCheckIns() {
  return readStorage<CheckIn[]>(CHECKINS_STORAGE_KEY, []);
}

export function saveCheckIns(checkIns: CheckIn[]) {
  writeStorage(CHECKINS_STORAGE_KEY, checkIns);
  return checkIns;
}

export function saveCheckIn(checkIn: CheckIn) {
  const checkIns = loadCheckIns();
  const existingIndex = checkIns.findIndex((item) => item.id === checkIn.id);

  if (existingIndex >= 0) {
    const nextCheckIns = [...checkIns];
    nextCheckIns[existingIndex] = checkIn;
    return saveCheckIns(nextCheckIns);
  }

  return saveCheckIns([checkIn, ...checkIns]);
}

export function updateCheckIn(checkInId: string, updates: Partial<CheckIn>) {
  const checkIns = loadCheckIns();
  let updatedCheckIn: CheckIn | null = null;

  const nextCheckIns = checkIns.map((checkIn) => {
    if (checkIn.id !== checkInId) {
      return checkIn;
    }

    updatedCheckIn = {
      ...checkIn,
      ...updates
    };

    return updatedCheckIn;
  });

  if (!updatedCheckIn) {
    return null;
  }

  saveCheckIns(nextCheckIns);
  return updatedCheckIn;
}
