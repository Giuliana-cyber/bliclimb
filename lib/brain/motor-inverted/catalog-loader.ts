/**
 * Motor invertido · catalog-loader · Fase 2.
 *
 * Lee el JSON bundeled `data/catalog-v3.1.json` (generado por
 * `scripts/rediseno/regenerate_v31.py` + `scripts/rediseno/xlsx-to-json.mjs`)
 * y expone `loadCatalog()` con caché in-memory.
 *
 * En prod el JSON viaja con el bundle. Cuando se migre a Supabase
 * (post-Fase-4), este loader se reemplaza por una query — el resto del
 * motor invertido usa los mismos tipos.
 */

import type {
  Catalog, Exercise, Gate, Protocol, Relationship, EquipmentToken, FocusRule,
} from './types';
import rawCatalog from '@/data/catalog-v3.1.json';

let cache: Catalog | null = null;

const EQUIPMENT_TOKENS = new Set<string>([
  'gym', 'hangboard', 'campus', 'weights', 'rock',
  'home', 'bands', 'pullup_bar', 'trx',
  'dynamometer', 'pinch_block',
]);

function parseEquipment(raw: string): EquipmentToken[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t): t is EquipmentToken => EQUIPMENT_TOKENS.has(t)) as EquipmentToken[];
}

function toBool(s: string): boolean {
  return s === 'true' || s === 'True' || s === '1' || s === 'yes';
}

function nullableNum(s: string): number | null {
  if (!s || s === 'None' || s === 'null') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function loadExercises(): Exercise[] {
  const rows = (rawCatalog as any).APP_ExerciseCatalog as Record<string, string>[];
  return rows.map((r) => ({
    id: r.exercise_id,
    name: r.name_es,
    category: r.category,
    objective: r.objective,
    levelMin: r.level_min || undefined,
    levelMax: r.level_max || undefined,
    environment: r.environment || undefined,
    equipmentRaw: r.equipment,
    equipmentTokens: parseEquipment(r.equipment),
    executionSummary: r.execution_summary,
    progression: r.progression,
    regression: r.regression,
    riskLevel: r.risk_level,
    stopSignals: r.stop_signals,
    gates: r.gates ? r.gates.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
    sourceTrace: r.source_trace,
    sprint: r.sprint,
    status: r.status,
  }));
}

function loadProtocols(): Protocol[] {
  const rows = (rawCatalog as any).APP_ProtocolCatalog as Record<string, string>[];
  return rows.map((r) => ({
    id: r.protocol_id,
    name: r.name_es,
    objective: r.objective,
    eligibleLevel: r.eligible_level,
    exerciseIds: r.exercise_ids,
    structure: r.structure,
    workRaw: r.work,
    workMinS: nullableNum(r.work_min_s),
    workMaxS: nullableNum(r.work_max_s),
    restRaw: r.rest,
    restMinS: nullableNum(r.rest_min_s),
    restMaxS: nullableNum(r.rest_max_s),
    setsRaw: r.sets,
    setsMin: nullableNum(r.sets_min),
    setsMax: nullableNum(r.sets_max),
    repsRaw: r.reps,
    repsMin: nullableNum(r.reps_min),
    repsMax: nullableNum(r.reps_max),
    intensityRaw: r.intensity,
    intensityPctMin: nullableNum(r.intensity_pct_min),
    intensityPctMax: nullableNum(r.intensity_pct_max),
    notesDosage: r.notes_dosage,
    frequency: r.frequency,
    progression: r.progression,
    regression: r.regression,
    riskLevel: r.risk_level,
    gates: r.gates ? r.gates.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
    status: r.status,
  }));
}

function loadGates(): Gate[] {
  const rows = (rawCatalog as any).APP_GateCatalog as Record<string, string>[];
  return rows.map((r) => ({
    id: r.gate_id,
    name: r.name,
    category: r.category,
    condition: r.condition,
    action: r.action,
    severity: r.severity,
    isWarning: toBool(r.is_warning),
    appliesTo: r.applies_to,
    reason: r.reason,
    requiresValidation: r.requires_validation === 'yes',
  }));
}

function loadFocusRules(): FocusRule[] {
  const rows = ((rawCatalog as any).FocusRules ?? []) as Record<string, string>[];
  return rows.map((r) => ({
    id: r.focus_rule_id,
    priorityOrder: Number(r.priority_order) || 99,
    condition: r.condition_expression,
    focusPhase: r.focus_phase,
    primaryPriority: r.primary_priority,
    secondaryPriority: r.secondary_priority,
    avoidOrLimit: r.avoid_or_limit,
    rationaleUser: r.rationale_user,
    status: r.status,
    reviewNote: r.review_note,
  }));
}

function loadRelationships(): Relationship[] {
  const rows = (rawCatalog as any).APP_Relationships as Record<string, string>[];
  return rows.map((r) => ({
    id: r.relationship_id,
    fromId: r.from_id,
    relation: r.relation,
    toId: r.to_id,
    category: r.category,
    notes: r.notes,
  }));
}

/**
 * Carga catálogo v3.1 con índices poblados. Cache in-memory.
 */
export function loadCatalog(): Catalog {
  if (cache) return cache;

  const exercises = loadExercises();
  const protocols = loadProtocols();
  const gates = loadGates();
  const relationships = loadRelationships();
  const focusRules = loadFocusRules();

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const gateById = new Map(gates.map((g) => [g.id, g]));
  const protocolById = new Map(protocols.map((p) => [p.id, p]));

  // Poblar gates de ejercicios desde relationships (F1.3 canónicas)
  const exerciseGatesById = new Map<string, string[]>();
  for (const rel of relationships) {
    if (
      rel.fromId.startsWith('EX-') &&
      rel.toId.startsWith('GT-') &&
      (rel.relation === 'BLOCKED_BY' ||
        rel.relation === 'CONTROLLED_BY' ||
        rel.relation === 'GOVERNED_BY')
    ) {
      const existing = exerciseGatesById.get(rel.fromId) ?? [];
      if (!existing.includes(rel.toId)) existing.push(rel.toId);
      exerciseGatesById.set(rel.fromId, existing);
    }
  }

  cache = {
    exercises,
    protocols,
    gates,
    relationships,
    focusRules,
    exerciseById,
    gateById,
    protocolById,
    exerciseGatesById,
  };
  return cache;
}

/**
 * Reset caché (útil para tests que necesitan aislamiento).
 */
export function resetCatalogCache(): void {
  cache = null;
}

/**
 * Filtro por categoría — usado por el slice de Fase 2 restringido a
 * `fuerza-dedos`. Post-Fase-4 se abre a las 15 categorías.
 */
export function filterByCategory(catalog: Catalog, cat: string): Exercise[] {
  return catalog.exercises.filter((e) => e.category === cat);
}
