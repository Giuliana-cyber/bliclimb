// Sección 2 del Doc 02 v3 — Gating de ejercicios (Parte A: traducción pura).
//
// Traduce las CATEGORÍAS semánticas emitidas por section-01 (perfil) a un
// BlockedExerciseMatcher que apunta contra IDs concretos del catálogo Sheet 01.
//
// Estrategia (fase-3-subfase-2-etiquetado.md):
//   - Familias limpias (HB-*, CB-*, IDs específicos como FM-014) → hardcoded acá.
//   - Familias dispersas (test-maximo, dominadas-con-lastre) → Parte B agrega
//     etiqueta en Sheet 01. En Parte A hardcodeo los IDs de la spec como
//     transición; Parte B mueve la fuente de verdad a la DB.
//   - Full crimp → NO es lista de IDs. Se traduce a GripRestriction (constraint
//     al LLM, no bloqueo de ejercicios). Confirmado revisando IDs uno por uno:
//     ninguno era ejercicio de full crimp, eran conceptos/avisos/tests.
//
// NO se usa la columna Intensidad/Nivel de Sheet 01 (80+ variantes
// ortográficas, frágil para seguridad). Deuda de canonicalización condicional.
//
// Precedencia: este módulo CONSUME `blockedCategories` producidas por section-01.
// El validator llama section-01 primero y section-02 después. Los filtros de
// perfil mandan sobre este gating por construcción.

import type {
  BlockedCategory,
  BlockedExerciseMatcher,
  GripRestriction
} from '../types';

// -------------------- Prefijos de familia --------------------
// (fase-3-subfase-2-etiquetado.md, "Bloqueo por familia de ID")
const HANGBOARD_PREFIX = 'HB-';
const CAMPUS_PREFIX = 'CB-';

// -------------------- IDs específicos --------------------
// HIT: identificados exactos (fase-3-subfase-2-etiquetado.md).
const HIT_IDS = ['FM-014', 'PF-FM-005'] as const;

// Etiqueta `test-maximo` (spec): 15 IDs. Parte B mueve a Sheet 01. Hasta
// entonces, hardcode acá. Regla 2.5 del Doc 02: no es bloqueo permanente,
// es gating a "modo evaluación" — pero sub-fase 2 Parte A los trata como
// bloqueados para el flujo normal de generación de plan (no hay "modo
// evaluación" todavía). Cuando aterrice el modo evaluación, se refina.
const TEST_MAXIMO_IDS = [
  'FD-006',       // Suspensión máxima en 25mm
  'FD-007',       // Test MIFS (fuerza isométrica máxima de dedos)
  'FD-008',       // Fuerza máxima de flexores
  'FD-009',       // Resistencia de dedos con contracciones máximas (E1/E2)
  'HB-007',       // Dead hang 11mm hasta fallo (cubierto también por HB- prefix)
  'CD-009',       // Prefatiga + escalada hasta fallo
  'EV-CF',        // Critical Force Test
  'EV-GRIP-PULL', // Grip + Pull-up hasta fallo
  'EV-FM-002',    // Isometric pull-up force
  'EV-FM-004',    // Bent-arm hang hasta fallo
  'FTE-002',      // 1RM dominada con lastre (doble cobertura con dominadas-con-lastre)
  'EVT-PO-001',   // RFD contracción máxima
  'EV-CB-001',    // Maximal reach en campus (cubierto también por CB- prefix)
  'EV-CB-003',    // Isometric pull-up force en campus (cubierto también por CB-)
  'EV-CB-004'     // RFD en campus (cubierto también por CB-)
] as const;

// Etiqueta `dominadas-con-lastre` (spec): 2 IDs.
const PULLUPS_WEIGHTED_IDS = [
  'FT-002',   // Dominada con lastre (progresión Hörst)
  'FTE-002'   // 1RM de dominada con lastre (doble cobertura con test-maximo)
] as const;

// Deuda #10 · potencia máxima con contact strength: 2 IDs.
// Ambos llevan tag `riesgo-lesion:power-max` en el catálogo (0027).
// El matcher de Paso 5 los filtra por tag; esta lista sirve al
// section01PlanGating post-generación como red posterior.
const POWER_MAX_IDS = [
  'PO-DEADSTOP',   // Dead Stop (precisión dinámica)
  'PO-POWERPU'     // Power Pull-up (dominada explosiva)
] as const;

// -------------------- Traducción central --------------------

/**
 * Traduce el conjunto de categorías bloqueadas por perfil a un
 * BlockedExerciseMatcher + GripRestrictions.
 *
 * Función pura. Sin acceso a DB. Sub-fase 2 Parte B moverá los IDs
 * hardcodeados (test-maximo, dominadas-con-lastre) a etiquetas en Sheet 01;
 * hasta entonces conviven las 2 fuentes de verdad (código + DB una vez
 * seedeada la etiqueta).
 */
export function translateCategoriesToGating(
  categories: ReadonlySet<BlockedCategory>
): {
  matcher: BlockedExerciseMatcher;
  gripRestrictions: Set<GripRestriction>;
} {
  const exactIds = new Set<string>();
  const prefixes = new Set<string>();
  const gripRestrictions = new Set<GripRestriction>();

  // hangboard (canal entero, §1.1 menores) → prefijo HB-
  if (categories.has('hangboard')) {
    prefixes.add(HANGBOARD_PREFIX);
  }

  // hangboard-intense (§1.2 <2 años) → prefijo HB- también (más conservativo).
  // La spec de decisiones dice "hangboard intenso" pero no separa IDs de HB-*
  // por intensidad; ante duda, lado seguro = bloquear el canal entero mientras
  // no haya taxonomía Intensidad canonicalizada en Sheet 01.
  if (categories.has('hangboard-intense')) {
    prefixes.add(HANGBOARD_PREFIX);
  }

  // campus → prefijo CB- (§1.1 menores y §1.2 <2 años)
  if (categories.has('campus')) {
    prefixes.add(CAMPUS_PREFIX);
  }

  // HIT → 2 IDs exactos
  if (categories.has('hit')) {
    for (const id of HIT_IDS) exactIds.add(id);
  }

  // full-crimp → NO es lista de IDs. Se traduce a restricción de agarre.
  if (categories.has('full-crimp')) {
    gripRestrictions.add('no-full-crimp');
  }

  // finger-training-any → cubre-todo semántico. Bloquea hangboard + campus
  // como canales que cargan dedos con dispositivo. Los otros ejercicios de
  // dedos (FD-*) no se bloquean automáticamente aquí — §1.1 ya emite las
  // otras categorías (hangboard, campus, full-crimp, hit) que los cubren
  // vía sus prefijos e IDs. `finger-training-any` es reforzador de esa
  // intención semántica.
  if (categories.has('finger-training-any')) {
    prefixes.add(HANGBOARD_PREFIX);
    prefixes.add(CAMPUS_PREFIX);
  }

  // pullups-weighted (§1.2) → 2 IDs específicos
  if (categories.has('pullups-weighted')) {
    for (const id of PULLUPS_WEIGHTED_IDS) exactIds.add(id);
  }

  // max-tests (§1.2, referencia a §2.5) → 15 IDs específicos
  if (categories.has('max-tests')) {
    for (const id of TEST_MAXIMO_IDS) exactIds.add(id);
  }

  // power-max (§1.1, §1.2 · Deuda #10) → 2 IDs específicos.
  //
  // Deuda #10 cerrada por 0027 (tag riesgo-lesion:power-max) + este mapping.
  // Los dos rows PO-DEADSTOP y PO-POWERPU llevan el tag en el catálogo, y
  // el matcher (resolveToCanonical, Paso 5) los filtra directamente por tag.
  // Esta lista hardcoded existe para simetría con las otras categorías —
  // si el matcher no consume la fila del catálogo (path legacy o retry
  // interno), el section01PlanGating de plan-level la sigue atrapando por
  // enum blockCategory + el matcher de IDs de acá.
  if (categories.has('power-max')) {
    for (const id of POWER_MAX_IDS) exactIds.add(id);
  }

  return { matcher: { exactIds, prefixes }, gripRestrictions };
}

// Exports para tests / debugging
export const _internals = {
  HANGBOARD_PREFIX,
  CAMPUS_PREFIX,
  HIT_IDS,
  TEST_MAXIMO_IDS,
  PULLUPS_WEIGHTED_IDS,
  POWER_MAX_IDS
} as const;
