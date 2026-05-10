import type { Session, TrainingPlan, Week } from '@/lib/plan';

export type SessionWithContext = {
  plan: TrainingPlan;
  week: Week;
  session: Session;
  sessionId: string;
};

export type TodayTrainingState =
  | {
      kind: 'ready';
      plan: TrainingPlan;
      week: Week;
      session: Session;
      sessionId: string;
      message: string;
    }
  | {
      kind: 'needs-checkin';
      plan: TrainingPlan;
      week: Week;
      session: Session;
      sessionId: string;
      message: string;
    }
  | {
      kind: 'completed';
      plan: TrainingPlan;
      week: Week;
      session: Session;
      sessionId: string;
      message: string;
    }
  | {
      kind: 'rest';
      plan: TrainingPlan;
      week: Week;
      message: string;
    }
  | {
      kind: 'plan-completed';
      plan: TrainingPlan;
      message: string;
    };

export function getSessionId(planId: string, weekNumber: number, dayNumber: number) {
  return `${planId}:week-${weekNumber}:day-${dayNumber}`;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getDaysSinceStart(startDate: string, today: Date) {
  const start = startOfDay(new Date(startDate));
  const current = startOfDay(today);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((current.getTime() - start.getTime()) / 86400000));
}

export function getPlanWeekNumber(plan: TrainingPlan, today = new Date()) {
  const daysSinceStart = getDaysSinceStart(plan.startDate, today);
  return Math.floor(daysSinceStart / 7) + 1;
}

export function getCurrentWeekNumber(plan: TrainingPlan, today = new Date()) {
  return Math.min(plan.totalWeeks, Math.max(1, getPlanWeekNumber(plan, today)));
}

export function withDerivedCurrentWeek(plan: TrainingPlan, today = new Date()): TrainingPlan {
  return {
    ...plan,
    currentWeek: getCurrentWeekNumber(plan, today)
  };
}

function getSessionSlots(sessionCount: number) {
  if (sessionCount <= 0) {
    return [];
  }

  if (sessionCount === 1) {
    return [0];
  }

  if (sessionCount === 2) {
    return [0, 3];
  }

  if (sessionCount === 3) {
    return [0, 2, 4];
  }

  if (sessionCount === 4) {
    return [0, 2, 4, 5];
  }

  if (sessionCount === 5) {
    return [0, 1, 2, 4, 5];
  }

  return [0, 1, 2, 3, 4, 5].slice(0, sessionCount);
}

function getScheduledSessionIndex(dayInWeek: number, sessionCount: number) {
  return getSessionSlots(sessionCount).findIndex((slot) => slot === dayInWeek);
}

function getPreviousScheduledSession(plan: TrainingPlan, weekNumber: number, dayInWeek: number) {
  const orderedWeeks = [...plan.weeks].sort((first, second) => first.weekNumber - second.weekNumber);
  const currentWeekIndex = orderedWeeks.findIndex((week) => week.weekNumber === weekNumber);

  for (let weekIndex = currentWeekIndex; weekIndex >= 0; weekIndex -= 1) {
    const week = orderedWeeks[weekIndex];
    const slots = getSessionSlots(week.sessions.length);
    const maxSlot = week.weekNumber === weekNumber ? dayInWeek - 1 : 6;

    for (let slotIndex = slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
      const slotDay = slots[slotIndex];

      if (slotDay > maxSlot) {
        continue;
      }

      const session = week.sessions[slotIndex];

      if (session && !session.checkIn) {
        return {
          week,
          session,
          sessionId: getSessionId(plan.id, week.weekNumber, session.dayNumber)
        };
      }
    }
  }

  return null;
}

export function getTodayTrainingState(plan: TrainingPlan, today = new Date()): TodayTrainingState {
  const daysSinceStart = getDaysSinceStart(plan.startDate, today);
  const weekNumber = getPlanWeekNumber(plan, today);

  if (weekNumber > plan.totalWeeks) {
    return {
      kind: 'plan-completed',
      plan,
      message: 'Tu plan ya terminó. Puedes revisar tu progreso o regenerar un nuevo bloque.'
    };
  }

  const week =
    plan.weeks.find((currentWeek) => currentWeek.weekNumber === weekNumber) ??
    plan.weeks.find((currentWeek) => currentWeek.weekNumber === plan.currentWeek) ??
    plan.weeks[0];

  if (!week) {
    return {
      kind: 'plan-completed',
      plan,
      message: 'No encontramos semanas activas en tu plan.'
    };
  }

  const dayInWeek = daysSinceStart % 7;
  const previousSession = getPreviousScheduledSession(plan, week.weekNumber, dayInWeek);

  if (previousSession) {
    return {
      kind: 'needs-checkin',
      plan,
      ...previousSession,
      message: 'Tienes una sesión anterior sin check-in. Regístrala para ajustar el seguimiento.'
    };
  }

  const scheduledSessionIndex = getScheduledSessionIndex(dayInWeek, week.sessions.length);

  if (scheduledSessionIndex < 0) {
    return {
      kind: 'rest',
      plan,
      week,
      message: 'Hoy descansas. Movilidad suave o caminata ligera opcional.'
    };
  }

  const session = week.sessions[scheduledSessionIndex];

  if (!session) {
    return {
      kind: 'rest',
      plan,
      week,
      message: 'Hoy descansas. Movilidad suave o caminata ligera opcional.'
    };
  }

  const sessionId = getSessionId(plan.id, week.weekNumber, session.dayNumber);

  if (session.checkIn) {
    return {
      kind: 'completed',
      plan,
      week,
      session,
      sessionId,
      message: 'Ya registraste la sesión de hoy. Buen trabajo.'
    };
  }

  return {
    kind: 'ready',
    plan,
    week,
    session,
    sessionId,
    message: 'Sesión lista para entrenar.'
  };
}

export function getTodaySession(plan: TrainingPlan): SessionWithContext | null {
  const state = getTodayTrainingState(plan);

  if (state.kind !== 'ready' && state.kind !== 'needs-checkin' && state.kind !== 'completed') {
    return null;
  }

  return {
    plan: state.plan,
    week: state.week,
    session: state.session,
    sessionId: state.sessionId
  };
}
