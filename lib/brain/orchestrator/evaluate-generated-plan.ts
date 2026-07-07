// Orquestador de validators plan-level. Corre los 4 módulos y agrupa
// violations por severity. Función pura — sin IO, testeable sin mocks.
//
// Consumido por el retry loop en app/api/generate-plan/route.ts.

import { section01PlanGating } from '../rules/section-01-plan-gating';
import {
  section03SessionProgramming,
  section10LoadAlternation
} from '../rules/section-03-session-programming';
import { section14ElbowPrevention } from '../rules/section-14-elbow-prevention';
import type { PlanForRules, PlanViolation, ProfileForRules } from '../types';

export type PlanEvaluation = {
  /** Violations que disparan retry / fallback. section-01/03/14. */
  blocking: PlanViolation[];
  /** Advisory que se pasan como hint pero NO disparan retry. §10.6. */
  advisory: PlanViolation[];
  /** Todas las violations en un solo array (blocking + advisory). */
  all: PlanViolation[];
};

/**
 * Corre los 4 validators plan-level y devuelve las violations agrupadas
 * por severity. Todos corren SIEMPRE (no early-return) para maximizar
 * información al retry prompt en una sola pasada.
 *
 * Orden de aparición en `all[]`:
 *   1) §1.gating (más crítico — safety de menores)
 *   2) §3.x    (session programming)
 *   3) §14.2   (elbow prevention, requiere profile)
 *   4) §10.6   (advisory, alternancia)
 */
export function evaluateGeneratedPlan(
  plan: PlanForRules,
  profile?: ProfileForRules
): PlanEvaluation {
  const all: PlanViolation[] = [
    ...section01PlanGating.check(plan, profile),
    ...section03SessionProgramming.check(plan, profile),
    ...section14ElbowPrevention.check(plan, profile),
    ...section10LoadAlternation.check(plan, profile)
  ];
  const blocking = all.filter((v) => v.severity === 'blocking');
  const advisory = all.filter((v) => v.severity === 'advisory');
  return { blocking, advisory, all };
}
