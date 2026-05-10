import type { Session, TrainingPlan, Week } from '@/lib/plan';

export type SessionWithContext = {
  plan: TrainingPlan;
  week: Week;
  session: Session;
  sessionId: string;
};

export function getSessionId(planId: string, weekNumber: number, dayNumber: number) {
  return `${planId}:week-${weekNumber}:day-${dayNumber}`;
}

export function getTodaySession(plan: TrainingPlan): SessionWithContext | null {
  const currentWeek =
    plan.weeks.find((week) => week.weekNumber === plan.currentWeek) ?? plan.weeks[0] ?? null;

  if (!currentWeek) {
    return null;
  }

  const session =
    currentWeek.sessions.find((currentSession) => !currentSession.completed) ??
    currentWeek.sessions[0] ??
    null;

  if (!session) {
    return null;
  }

  return {
    plan,
    week: currentWeek,
    session,
    sessionId: getSessionId(plan.id, currentWeek.weekNumber, session.dayNumber)
  };
}
