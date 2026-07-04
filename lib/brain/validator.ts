// Orquestador del middleware de seguridad (Doc 02).
//
// Corre los módulos de reglas en orden de precedencia y acumula bloqueos
// en un BlockingContext. Sub-fase 1 solo enlaza section-01. Sub-fases
// posteriores encadenan section-02 (gating de ejercicio), section-05
// (derivación reactiva), section-03 (programación de sesión), etc.
//
// Sub-fase 1 NO wirea con generate-plan/route.ts — solo expone la función
// pura evaluateProfile() para tests. La integración con generate-plan va
// en la sub-fase final del middleware.

import { ConsoleLogSink } from './logging';
import { section01ProfileFilters } from './rules/section-01-profile-filters';
import { translateCategoriesToGating } from './rules/section-02-exercise-gating';
import type { BlockingContext, LogSink, ProfileForRules, RuleModule } from './types';

// Orden de precedencia — reglas de nivel superior invalidan permisos de
// niveles inferiores. Sub-fase 1: solo perfil. Se agregan módulos en su
// posición correcta a medida que las sub-fases posteriores los implementen.
const ENABLED_MODULES: RuleModule[] = [section01ProfileFilters];

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
    derivationMessages: [],
    ruleHits: []
  };

  // ---------- Section-01: gate de perfil ----------
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
        timestamp: new Date().toISOString()
      });

      if (v.kind === 'block-categories') {
        for (const c of v.categories) ctx.blockedCategories.add(c);
      } else if (v.kind === 'block-zone') {
        ctx.blockedZones.add(v.zone);
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
