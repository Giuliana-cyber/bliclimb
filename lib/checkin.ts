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
}
