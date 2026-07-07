// Convierte TrainingPlan (runtime) a PlanForRules (subset que consumen los
// validators). Adapter puro — sin lógica de negocio, solo mapping.
//
// Necesario porque los validators de lib/brain/ trabajan con PlanForRules
// (desacoplado de lib/plan.ts para tests puros), pero el route.ts arma
// TrainingPlan.

import type { Exercise, TrainingPlan } from '@/lib/plan';
import type { PlanExerciseForRules, PlanForRules } from '../types';

function mapExercise(e: Exercise): PlanExerciseForRules {
  return {
    name: e.name,
    stimulusCategory: e.stimulusCategory ?? null,
    riskLevel: e.riskLevel ?? null,
    blockCategory: e.blockCategory ?? null
  };
}

export function toPlanForRules(plan: TrainingPlan): PlanForRules {
  return {
    weeks: plan.weeks.map((w) => ({
      weekNumber: w.weekNumber,
      phase: w.phase ?? null,
      deloadWeek: w.deloadWeek ?? false,
      sessions: w.sessions.map((s) => ({
        dayNumber: s.dayNumber,
        title: s.title,
        stimulusCategory: s.stimulusCategory ?? null,
        intensityLevel: s.intensityLevel ?? null,
        estimatedMinutes: s.estimatedMinutes,
        warmup: (s.warmup ?? []).map(mapExercise),
        mainBlock: (s.mainBlock ?? []).map(mapExercise),
        cooldown: (s.cooldown ?? []).map(mapExercise)
      }))
    }))
  };
}
