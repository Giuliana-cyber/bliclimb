// Sección 14 del Doc 02 v3 — Prevención específica.
//
// Sub-fase 5 grupo 1: §14.2 (extensores). Primer PlanRuleModule que combina
// plan + profile — hasta acá section-03/section-10 eran plan-only.
//
// REGLA §14.2:
//   Un plan con 3+ sesiones de tracción en la semana DEBE incluir trabajo
//   de extensores en esa semana. Con historial de epicondilitis
//   (profile.injuries.includes('elbows')), el umbral baja a 1: cualquier
//   semana con ≥1 sesión de tracción exige extensores.
//
// DEFINICIONES OPERATIVAS (todas por enum, sin string matching):
//   - "sesión de tracción" = session.stimulusCategory ∈ {strength, power,
//     power-endurance, aerobic-base}. 'skill' NO cuenta (drills técnicos
//     pueden ejecutarse sin escalar/traccionar). 'warmup/cooldown/mobility/
//     mental/rest' obviamente no cuentan.
//   - "trabajo de extensores" = al menos 1 exercise con stimulusCategory
//     === 'mobility' en cualquier bloque (warmup/mainBlock/cooldown) de
//     cualquier sesión de la semana. Es un PROXY generoso — cualquier
//     mobility cumple. Cuando aterrice un flag isExtensorWork per-exercise,
//     apretar el check (ver canonicalization-debt.md).
//
// SEVERITY: 'blocking' en ambos casos (Doc 02 la define como regla dura).
// El diagnostic.reason permite al retry prompt priorizar:
//   'epicondylitis-history' → mensaje distinto ("historial de codo obliga")
//   'traction-threshold'    → mensaje standard prevención

import { SECTION_14_RULE_SUMMARIES } from '../messages/section-14';
import type {
  PlanExerciseForRules,
  PlanForRules,
  PlanRuleModule,
  PlanSessionForRules,
  PlanViolation,
  PlanWeekForRules,
  ProfileForRules
} from '../types';

// Categorías que cuentan como "sesión de tracción".
const TRACTION_STIMULI = new Set([
  'strength',
  'power',
  'power-endurance',
  'aerobic-base'
] as const);

function isTractionSession(session: PlanSessionForRules): boolean {
  return (
    session.stimulusCategory != null &&
    TRACTION_STIMULI.has(session.stimulusCategory as never)
  );
}

function isExtensorProxyExercise(ex: PlanExerciseForRules | null | undefined): boolean {
  return ex?.stimulusCategory === 'mobility';
}

function weekHasExtensorWork(week: PlanWeekForRules): boolean {
  for (const session of week.sessions) {
    for (const ex of session.warmup ?? []) {
      if (isExtensorProxyExercise(ex)) return true;
    }
    for (const ex of session.mainBlock ?? []) {
      if (isExtensorProxyExercise(ex)) return true;
    }
    for (const ex of session.cooldown ?? []) {
      if (isExtensorProxyExercise(ex)) return true;
    }
  }
  return false;
}

/** Umbrales del Doc 02 §14.2. */
const TRACTION_THRESHOLD_DEFAULT = 3;
const TRACTION_THRESHOLD_EPICONDYLITIS = 1;

function hasEpicondylitisHistory(profile?: ProfileForRules): boolean {
  if (!profile) return false;
  return profile.injuries.some((i) => i.toLowerCase() === 'elbows');
}

function makeViolation(
  week: PlanWeekForRules,
  tractionDays: number,
  hasHistory: boolean
): PlanViolation {
  const summary = SECTION_14_RULE_SUMMARIES['14.2'];
  return {
    rule: '14.2',
    section: 'section-14',
    severity: 'blocking',
    location: { weekNumber: week.weekNumber },
    details: {
      kind: 'missing-extensor-work',
      tractionDaysInWeek: tractionDays,
      hasEpicondylitisHistory: hasHistory,
      reason: hasHistory ? 'epicondylitis-history' : 'traction-threshold'
    },
    ruleSummary: summary.text,
    source: summary.source
  };
}

function check_14_2(
  plan: PlanForRules,
  profile?: ProfileForRules
): PlanViolation[] {
  const out: PlanViolation[] = [];
  const hasHistory = hasEpicondylitisHistory(profile);
  const threshold = hasHistory
    ? TRACTION_THRESHOLD_EPICONDYLITIS
    : TRACTION_THRESHOLD_DEFAULT;

  for (const week of plan.weeks) {
    const tractionDays = week.sessions.filter(isTractionSession).length;

    // Fallback permisivo: si la semana no tiene ninguna sesión con
    // stimulusCategory conocido, no aplica (plan viejo pre-schema).
    const someCategorized = week.sessions.some(
      (s) => s.stimulusCategory != null
    );
    if (!someCategorized) continue;

    if (tractionDays < threshold) continue;

    if (weekHasExtensorWork(week)) continue;

    out.push(makeViolation(week, tractionDays, hasHistory));
  }
  return out;
}

// -------------------- Módulo exportado --------------------

export const section14ElbowPrevention: PlanRuleModule = {
  section: 'section-14',
  ruleIds: ['14.2'] as const,
  check(plan: PlanForRules, profile?: ProfileForRules): PlanViolation[] {
    return check_14_2(plan, profile);
  }
};
