// Orquestador del middleware de seguridad (Doc 02).
//
// Corre los módulos de reglas en orden de precedencia y acumula bloqueos
// en un BlockingContext. Sub-fase 1 solo enlazó section-01. Sub-fase 2
// agregó section-02 (traducción de categorías → IDs). Sub-fase 3 agrega
// section-05 (derivación de salud, §5.2/§5.3/§5.4).
//
// El wiring con generate-plan/route.ts va en la sub-fase final del
// middleware — este archivo expone la función pura evaluateProfile() para
// tests y consumo futuro.

import { ConsoleLogSink } from './logging';
import { section01ProfileFilters } from './rules/section-01-profile-filters';
import { translateCategoriesToGating } from './rules/section-02-exercise-gating';
import { section05HealthDerivation } from './rules/section-05-health-derivation';
import type { BlockingContext, LogSink, ProfileForRules, RuleModule } from './types';

// Orden de precedencia — reglas de nivel superior invalidan permisos de
// niveles inferiores. Section-05 corre después de section-01 porque §5.x
// añade restricciones ortogonales a los bloqueos de §1.x (grip restrictions
// + training priorities + intensity adjustments son sets aditivos, no
// interfieren con blockedCategories/blockedZones).
const ENABLED_MODULES: RuleModule[] = [
  section01ProfileFilters,
  section05HealthDerivation
];

export type EvaluateProfileOptions = {
  /** ID del profile en Supabase, si aplica. Para trazabilidad en logs. */
  profileId?: string | null;
  /** Sink de logging. Default: ConsoleLogSink (stdout JSON). */
  log?: LogSink;
};

/**
 * Evalúa un perfil contra todos los módulos habilitados y devuelve el
 * BlockingContext acumulado. Cada Verdict emitido se loguea a través del
 * LogSink.
 *
 * Función pura — no muta el profile ni el modules array. Se puede llamar
 * en cualquier orden, dentro de tests o en runtime.
 */
export function evaluateProfile(
  profile: ProfileForRules,
  options: EvaluateProfileOptions = {}
): BlockingContext {
  const log = options.log ?? new ConsoleLogSink();
  const profileId = options.profileId ?? null;
  const ctx: BlockingContext = {
    blockedCategories: new Set(),
    blockedZones: new Set(),
    blockedExercises: { exactIds: new Set(), prefixes: new Set() },
    gripRestrictions: new Set(),
    trainingPriorities: new Set(),
    intensityAdjustments: new Set(),
    derivationMessages: [],
    ruleHits: []
  };

  // ---------- Módulos de reglas (section-01, section-05) ----------
  for (const mod of ENABLED_MODULES) {
    for (const v of mod.check(profile)) {
      ctx.ruleHits.push({ rule: v.rule, kind: v.kind });
      log.logBlock({
        section: mod.section,
        rule: v.rule,
        profileId,
        kind: v.kind,
        categories: v.kind === 'block-categories' ? v.categories : undefined,
        zone: v.kind === 'block-zone' ? v.zone : undefined,
        restriction: v.kind === 'add-grip-restriction' ? v.restriction : undefined,
        priority: v.kind === 'add-training-priority' ? v.priority : undefined,
        adjustment:
          v.kind === 'add-intensity-adjustment' ? v.adjustment : undefined,
        timestamp: new Date().toISOString()
      });

      if (v.kind === 'block-categories') {
        for (const c of v.categories) ctx.blockedCategories.add(c);
      } else if (v.kind === 'block-zone') {
        ctx.blockedZones.add(v.zone);
      } else if (v.kind === 'add-grip-restriction') {
        ctx.gripRestrictions.add(v.restriction);
      } else if (v.kind === 'add-training-priority') {
        ctx.trainingPriorities.add(v.priority);
      } else if (v.kind === 'add-intensity-adjustment') {
        ctx.intensityAdjustments.add(v.adjustment);
      }
      ctx.derivationMessages.push(v.userMessage);
    }
  }

  // ---------- Section-02: gating de ejercicios (traducción de categorías) ----------
  //
  // Consume las blockedCategories acumuladas y traduce a IDs concretos del
  // catálogo. Los filtros de perfil mandan sobre este gating por
  // construcción: sin categorías bloqueadas, no hay IDs bloqueados.
  const gating = translateCategoriesToGating(ctx.blockedCategories);
  gating.matcher.exactIds.forEach((id) => ctx.blockedExercises.exactIds.add(id));
  gating.matcher.prefixes.forEach((p) => ctx.blockedExercises.prefixes.add(p));
  gating.gripRestrictions.forEach((g) => ctx.gripRestrictions.add(g));

  return ctx;
}
