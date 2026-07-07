// Sección 1 del Doc 02 v3 — enforcement plan-level.
//
// Contexto: section-01-profile-filters emite Verdicts al ejecutar sobre el
// perfil (u16 → bloquea hangboard/campus/etc). El middleware inyecta esas
// categorías al WEEK_PROMPT como PROHIBIDAS, y Bill *casi* siempre las
// respeta. Esta regla es la RED — atrapa cuando Bill se equivoca.
//
// Mecánica:
//   1. Correr evaluateProfile(profile) → BlockingContext.blockedCategories.
//   2. Para cada exercise en cada session en cada week del plan:
//        si exercise.blockCategory está en blockedCategories → violation.
//   3. Cruce enum → enum. Cero string matching sobre nombres.
//
// Requiere que el LLM etiquete cada exercise con `blockCategory` (schema
// extendido en el mismo PR). Si un exercise viene con `blockCategory ===
// null` o ausente, se SALTA (fallback permisivo). El prompt de Bill le
// pide etiquetar honestamente; el schema Zod fuerza que el campo exista
// como enum-o-null.
//
// Nivel: 'blocking' (§1.1/§1.2 son las reglas MÁS críticas del Doc 02).

import { evaluateProfile } from '../validator';
import { SECTION_01_PLAN_GATING_SUMMARY } from '../messages/section-01-plan-gating';
import type {
  BlockedCategory,
  PlanForRules,
  PlanRuleModule,
  PlanViolation,
  ProfileForRules
} from '../types';

function makeViolation(
  weekNumber: number,
  dayNumber: number,
  block: 'warmup' | 'mainBlock' | 'cooldown',
  exerciseIndex: number,
  exerciseName: string,
  blockedCategory: BlockedCategory,
  profileRule: string | null
): PlanViolation {
  return {
    rule: '1.gating',
    section: 'section-01',
    severity: 'blocking',
    location: {
      weekNumber,
      dayNumber,
      block,
      exerciseIndex
    },
    details: {
      kind: 'gated-exercise-slipped',
      exerciseName,
      blockedCategory,
      profileRule
    },
    ruleSummary: SECTION_01_PLAN_GATING_SUMMARY.text,
    source: SECTION_01_PLAN_GATING_SUMMARY.source
  };
}

/**
 * Devuelve, para cada BlockedCategory del contexto, la regla del perfil
 * que la originó. Usa ruleHits.
 * Si una categoría no tiene rule asociada (edge case), devuelve null.
 */
function mapCategoryToRule(
  categories: ReadonlySet<BlockedCategory>,
  ruleHits: ReadonlyArray<{ rule: string; kind: string }>
): Map<BlockedCategory, string | null> {
  // Todas las categorías vienen de verdicts con kind === 'block-categories'.
  // El BlockingContext no expone qué rule bloqueó qué categoría — solo
  // acumula el Set. Para el diagnostic tomamos el PRIMER rule de tipo
  // block-categories como aproximación (§1.1 antes que §1.2 en el orden
  // de evaluación). Esto es suficiente para el retry prompt.
  const map = new Map<BlockedCategory, string | null>();
  const firstBlockCatRule = ruleHits.find((h) => h.kind === 'block-categories')
    ?.rule ?? null;
  Array.from(categories).forEach((cat) => {
    map.set(cat, firstBlockCatRule);
  });
  return map;
}

/**
 * Chequea cada exercise del plan contra las categorías bloqueadas del
 * perfil. Fallback permisivo: si no hay profile o el plan no tiene
 * ningún exercise con blockCategory poblado, no dispara (compat con
 * planes viejos generados antes de este PR).
 */
function check_1_gating(
  plan: PlanForRules,
  profile?: ProfileForRules
): PlanViolation[] {
  if (!profile) return [];

  const ctx = evaluateProfile(profile);
  if (ctx.blockedCategories.size === 0) return [];

  const ruleByCategory = mapCategoryToRule(
    ctx.blockedCategories,
    ctx.ruleHits
  );

  const out: PlanViolation[] = [];
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const blocks: Array<{
        name: 'warmup' | 'mainBlock' | 'cooldown';
        list: NonNullable<typeof session.warmup>;
      }> = [];
      if (session.warmup) blocks.push({ name: 'warmup', list: session.warmup });
      if (session.mainBlock)
        blocks.push({ name: 'mainBlock', list: session.mainBlock });
      if (session.cooldown)
        blocks.push({ name: 'cooldown', list: session.cooldown });

      for (const { name: blockName, list } of blocks) {
        for (let i = 0; i < list.length; i++) {
          const ex = list[i];
          const cat = ex?.blockCategory;
          if (!cat) continue; // fallback permisivo
          if (!ctx.blockedCategories.has(cat)) continue;
          out.push(
            makeViolation(
              week.weekNumber,
              session.dayNumber,
              blockName,
              i,
              ex.name ?? '(unnamed)',
              cat,
              ruleByCategory.get(cat) ?? null
            )
          );
        }
      }
    }
  }
  return out;
}

export const section01PlanGating: PlanRuleModule = {
  section: 'section-01',
  ruleIds: ['1.gating'] as const,
  check(plan: PlanForRules, profile?: ProfileForRules): PlanViolation[] {
    return check_1_gating(plan, profile);
  }
};
