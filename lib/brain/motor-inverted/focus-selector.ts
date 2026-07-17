/**
 * Motor invertido · focus-selector · Fase 3.
 *
 * Deriva el FocusObject automáticamente desde el perfil aplicando las
 * 12 FocusRules del v3.0 (FR-001..FR-012) en orden de priority_order.
 * Primera regla que dispara gana.
 *
 * Reutiliza el parser de `gate-evaluator.ts` — mismas expresiones,
 * misma gramática, mismos campos del perfil derivados.
 *
 * Reglas del v3.0 (verbatim del catálogo):
 *   FR-001 (1) injury_active OR pain_current                → Seguridad
 *   FR-002 (2) comeback_status=returning OR rebuilding      → Reconstrucción
 *   FR-003 (3) condition_current=unknown OR datos faltantes → Conservador
 *   FR-004 (4) hang_25mm_seconds < 15                       → Reconstrucción de dedos
 *   FR-005 (5) classified_level IN [beginner, intermediate] → Base técnica
 *   FR-006 (6) condition_current=advanced AND hang≥15       → Específica
 *   FR-007 (7) rock_session_planned                         → Complemento de roca
 *   FR-008 (8) sessions_per_week_real low                   → Dosis mínima
 *   FR-009 (9) recovery/fatigue trend bad                   → Mantenimiento
 *   FR-010 (10) required_equipment_available=false          → Alternativa por equipo
 *   FR-011 (11) first_session                               → Primer valor
 *   FR-012 (12) goal_text present                           → Orientada al objetivo
 */

import type {
  Catalog, FocusObject, FocusRule, Profile, RiskLevel,
} from './types';
import { evaluateExpression, resolveField } from './gate-evaluator';

// ---------------------------------------------------------------------------
// Mapeo focus_phase (string español del v3.0) → phase enum + maxRiskLevel
// ---------------------------------------------------------------------------

interface PhaseMapping {
  phase: FocusObject['phase'];
  maxRiskLevel: RiskLevel;
}

const PHASE_MAP: Record<string, PhaseMapping> = {
  'seguridad / pausa específica': { phase: 'seguridad', maxRiskLevel: 'low' },
  'reconstrucción': { phase: 'reconstruccion', maxRiskLevel: 'medium' },
  'reconstrucción de dedos': { phase: 'reconstruccion', maxRiskLevel: 'medium' },
  'conservador': { phase: 'conservador', maxRiskLevel: 'low-medium' },
  'base técnica': { phase: 'base', maxRiskLevel: 'low-medium' },
  'específica': { phase: 'especifica', maxRiskLevel: 'high' },
  'complemento de roca': { phase: 'complemento', maxRiskLevel: 'medium' },
  'dosis mínima': { phase: 'base', maxRiskLevel: 'low-medium' },
  'mantenimiento / descarga': { phase: 'deload', maxRiskLevel: 'low' },
  'alternativa por equipo': { phase: 'base', maxRiskLevel: 'medium' },
  'primer valor': { phase: 'primer-valor', maxRiskLevel: 'low-medium' },
  'orientada al objetivo': { phase: 'especifica', maxRiskLevel: 'medium' },
};

function mapPhase(focusPhase: string): PhaseMapping {
  const key = focusPhase.trim().toLowerCase();
  return (
    PHASE_MAP[key] ?? {
      phase: 'base',
      maxRiskLevel: 'medium',
    }
  );
}

// ---------------------------------------------------------------------------
// Precondición: extender resolveField con los campos derivados que las
// FocusRules mencionan y que gate-evaluator no cubre por default.
// La estrategia es interceptar en evaluateFocusExpression.
// ---------------------------------------------------------------------------

/**
 * Extensión del vocabulario para las FocusRules (que usan campos
 * ligeramente distintos a los de Gates). El nombre `classified_level`,
 * `sessions_per_week_real`, etc. se derivan del perfil.
 */
function resolveFocusField(field: string, profile: Profile): unknown {
  const f = field.trim().toLowerCase();
  switch (f) {
    case 'classified_level': {
      const ct = profile.climbingTime;
      if (ct === 'start' || ct === 'less1') return 'beginner';
      if (ct === '1to3') return 'intermediate';
      if (ct === 'more3') return 'advanced';
      return 'unknown';
    }
    case 'no_blocking_gate':
      // Placeholder: en el pool phase asumimos que no hay gates bloqueantes
      // globales. Los específicos por candidato se resuelven en restrict-pool.
      return true;
    case 'sessions_per_week_real':
      // Todavía no en el perfil (Fase 4). "is low" se traduce a false por default.
      return null;
    case 'recovery_trend':
      // Sin check-in histórico aún (Fase 4). Devuelve 'ok' por default.
      return 'ok';
    case 'post_session_fatigue_trend':
      return 'ok';
    case 'goal_text':
      return null; // sin campo goal en profile todavía
    case 'goal_text present':
      return false;
    default:
      return resolveField(field, profile);
  }
}

/**
 * Evalúa una condition_expression de FocusRule contra un profile,
 * usando resolveFocusField para el vocabulario extendido.
 */
function evaluateFocusCondition(condition: string, profile: Profile): boolean {
  // Reemplazamos algunos idioms del v3.0 que no son sintaxis DSL:
  //   "sessions_per_week_real is low" → false por default
  //   "goal_text present"             → false
  //   "hang_unknown = true"           → hang_25mm_seconds unknown
  let norm = condition
    .replace(/\bsessions_per_week_real\s+is\s+low\b/gi, 'false')
    .replace(/\bgoal_text\s+present\b/gi, 'false')
    .replace(/\bhang_unknown\b/gi, 'hang_unknown');

  // Delegamos a evaluateExpression con un wrapper temporal sobre resolveField
  return evaluateWithFocusResolver(norm, profile);
}

/**
 * Wrapper de evaluateExpression que usa resolveFocusField.
 * Como gate-evaluator no expone un resolver custom, replicamos el parser
 * en línea acá — misma gramática pero con vocabulario extendido.
 */
function evaluateWithFocusResolver(expr: string, profile: Profile): boolean {
  if (!expr.trim()) return false;
  const norm = expr.replace(/\s+/g, ' ').trim();
  const tokens = norm.split(/\s+(AND|OR)\s+/i);
  let result: boolean | 'unknown' = evaluateClauseFocus(tokens[0]!, profile);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]!.toUpperCase();
    const next = evaluateClauseFocus(tokens[i + 1]!, profile);
    const a = result === 'unknown' ? false : result;
    const b = next === 'unknown' ? false : next;
    result = op === 'AND' ? a && b : a || b;
  }
  return result === 'unknown' ? false : result;
}

function evaluateClauseFocus(
  clause: string, profile: Profile,
): boolean | 'unknown' {
  const OP_ORDER = ['NOT IN', 'IN', '<=', '>=', '==', '!=', '<', '>', '='];
  let op: string | null = null;
  let left = '';
  let right = '';

  for (const candidate of OP_ORDER) {
    const parts = clause.split(new RegExp(`\\s*${candidate}\\s*`));
    if (parts.length === 2) {
      left = parts[0]!.trim();
      right = parts[1]!.trim();
      op = candidate;
      break;
    }
  }

  if (!op) {
    // Sin operador → boolean field
    const t = clause.trim();
    if (t === 'true') return true;
    if (t === 'false') return false;
    const v = resolveFocusField(t, profile);
    if (v === undefined) return 'unknown';
    return Boolean(v);
  }

  const leftVal = resolveFocusField(left, profile);
  if (leftVal === undefined) return 'unknown';
  const rightVal = parseAtom(right);

  switch (op) {
    case '=':
    case '==':
      return equalsLoose(leftVal, rightVal);
    case '!=':
      return !equalsLoose(leftVal, rightVal);
    case '<': {
      const c = coerceCompare(leftVal, rightVal);
      return c ? c[0] < c[1] : false;
    }
    case '>': {
      const c = coerceCompare(leftVal, rightVal);
      return c ? c[0] > c[1] : false;
    }
    case '<=': {
      const c = coerceCompare(leftVal, rightVal);
      return c ? c[0] <= c[1] : false;
    }
    case '>=': {
      const c = coerceCompare(leftVal, rightVal);
      return c ? c[0] >= c[1] : false;
    }
    case 'IN': {
      const arr = Array.isArray(rightVal) ? rightVal : [rightVal];
      if (Array.isArray(leftVal)) {
        return leftVal.some((lv) => arr.some((rv) => equalsLoose(lv, rv)));
      }
      return arr.some((v) => equalsLoose(leftVal, v));
    }
    case 'NOT IN': {
      const arr = Array.isArray(rightVal) ? rightVal : [rightVal];
      if (Array.isArray(leftVal)) {
        return !leftVal.some((lv) => arr.some((rv) => equalsLoose(lv, rv)));
      }
      return !arr.some((v) => equalsLoose(leftVal, v));
    }
    default:
      return 'unknown';
  }
}

type Value = string | number | boolean | Value[] | null;
function parseAtom(s: string): Value {
  const t = s.trim();
  if (!t) return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === 'none' || t === 'None') return null;
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((x) => parseAtom(x.trim()));
  }
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  const n = Number(t);
  if (Number.isFinite(n) && /^-?\d+(?:\.\d+)?$/.test(t)) return n;
  return t;
}

function coerceCompare(a: unknown, b: unknown): [number, number] | null {
  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return [na, nb];
  return null;
}

function equalsLoose(a: unknown, b: unknown): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return a === b;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export interface FocusSelection {
  focus: FocusObject;
  matchedRule: FocusRule;
  rulesEvaluated: number;
}

/**
 * Deriva el FocusObject automáticamente aplicando las 12 FocusRules
 * en orden de prioridad. Primera regla que dispara gana.
 *
 * Fail-closed: si ninguna regla dispara (raro pero posible con perfil
 * mínimo), devuelve un focus 'base' conservador.
 */
export function deriveFocus(
  catalog: Catalog,
  profile: Profile,
): FocusSelection {
  const rules = [...catalog.focusRules].sort(
    (a, b) => a.priorityOrder - b.priorityOrder,
  );

  let evaluated = 0;
  for (const rule of rules) {
    evaluated++;
    const triggered = evaluateFocusCondition(rule.condition, profile);
    if (triggered) {
      const mapping = mapPhase(rule.focusPhase);
      return {
        focus: {
          phase: mapping.phase,
          primaryPriority: rule.primaryPriority || 'Base técnica en muro',
          secondaryPriority: rule.secondaryPriority || undefined,
          avoid: parseAvoidList(rule.avoidOrLimit),
          narrative: rule.rationaleUser || '',
          maxRiskLevel: mapping.maxRiskLevel,
        },
        matchedRule: rule,
        rulesEvaluated: evaluated,
      };
    }
  }

  // Fallback conservador
  return {
    focus: {
      phase: 'base',
      primaryPriority: 'Base técnica en muro',
      avoid: [],
      narrative: 'Sin regla explícita — arrancamos con base técnica conservadora.',
      maxRiskLevel: 'low-medium',
    },
    matchedRule: {
      id: 'FR-DEFAULT',
      priorityOrder: 99,
      condition: '',
      focusPhase: 'base técnica',
      primaryPriority: 'Base técnica en muro',
      secondaryPriority: '',
      avoidOrLimit: '',
      rationaleUser: 'Fallback conservador cuando ninguna regla dispara.',
      status: 'default',
      reviewNote: '',
    },
    rulesEvaluated: evaluated,
  };
}

function parseAvoidList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
