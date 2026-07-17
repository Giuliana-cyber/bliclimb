/**
 * Motor invertido · gate-evaluator · Fase 2.
 *
 * Evalúa `condition_expression` de cada Gate contra un Profile.
 *
 * Estrategia: parser mini-DSL que soporta las 30 condiciones GT-FIN-*
 * observadas en v3.1. Suficiente para cerrar el slice de dedos.
 *
 * Gramática soportada:
 *   expr    := clause ('AND' | 'OR') clause
 *   clause  := field OP value
 *   OP      := '=' | '==' | '!=' | '<' | '>' | '<=' | '>='
 *            | 'IN' | 'NOT IN'
 *   value   := number | boolean | string | list ('[' v (',' v)* ']')
 *
 * Convención de fields (mapeo desde ProfileSchema v3.0):
 *   age                    → profile.age (u16 / adult)
 *   is_minor               → profile.age === 'u16'
 *   climbing_experience_years / years_climbing → derivado de climbingTime
 *   injury_active          → profile.injuries.length > 0
 *   pain_current           → cualquier currentXPain >= 3
 *   pain_zone              → derivado de currentXPain (finger/elbow/shoulder)
 *   current_pain_zone      → idem
 *   hang_25mm_seconds      → profile.hang25mmSeconds
 *   maxPullupReps          → profile.maxPullupReps
 *   grade_unknown          → siempre false por ahora
 *   condition_current      → 'rebuilding' si hang25mm<15 && maxPullup<15 && more3
 *   comeback_status        → 'returning' si more3 y condition_current=rebuilding
 *   fatigue_level          → profile.fatigueLevel
 *   red_s_risk             → profile.redSLeaFlags
 *   rock_session_planned   → hoy false (F4)
 *
 * Cualquier field no mapeado → clause devuelve `unknown` y la política
 * conservadora del slice es tratarlo como `false` (NO se activa el gate
 * cuando el campo es desconocido, salvo que la regla específica del gate
 * indique lo contrario — en cuyo caso se documenta arriba).
 */

import type {
  Gate, Profile, GateResult, CanonicalAction, CandidateState,
} from './types';

// ---------------------------------------------------------------------------
// Mapping action canónica → candidate state (extraído de GatePrecedence v3.0)
// ---------------------------------------------------------------------------

const ACTION_TO_STATE: Record<string, CandidateState> = {
  STOP_SESSION: 'BLOCKED',
  BLOCK: 'BLOCKED',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  STOP_OR_REGRESS: 'BLOCKED', // conservador: dolor→BLOCKED por default
  REGRESS: 'ADAPTED',
  SUBSTITUTE: 'ADAPTED',
  ADJUST_VOLUME: 'ADAPTED',
  REQUIRE_TECHNIQUE_DRILL: 'ADAPTED',
  REORDER: 'ADAPTED',
  HOLD: 'HELD',
  DEPRIORITIZE: 'ELIGIBLE',
  CUE_ONLY: 'ELIGIBLE',
  ALLOW_ONE_VARIABLE_ONLY: 'ELIGIBLE',
};

// ---------------------------------------------------------------------------
// Derivar campos del perfil
// ---------------------------------------------------------------------------

function yearsFromClimbingTime(ct: Profile['climbingTime']): number {
  switch (ct) {
    case 'start': return 0;
    case 'less1': return 0.5;
    case '1to3': return 2;
    case 'more3': return 4; // conservador
  }
}

function hasPain(profile: Profile): boolean {
  return (
    profile.currentFingerPain >= 3 ||
    profile.currentShoulderPain >= 3 ||
    profile.currentElbowPain >= 3
  );
}

function painZones(profile: Profile): string[] {
  const out: string[] = [];
  if (profile.currentFingerPain >= 3) out.push('finger', 'hand', 'wrist');
  if (profile.currentElbowPain >= 3) out.push('elbow');
  if (profile.currentShoulderPain >= 3) out.push('shoulder');
  return out;
}

function conditionCurrent(profile: Profile): string {
  const hang = profile.hang25mmSeconds;
  const pull = profile.maxPullupReps;
  if (hang !== null && hang < 15 && (pull === null || pull < 15)) {
    if (profile.climbingTime === 'more3') return 'rebuilding';
  }
  if (hang !== null && hang >= 15 && pull !== null && pull >= 15) {
    return 'advanced';
  }
  if (hang === null && pull === null) return 'unknown';
  return 'beginner-intermediate';
}

// Resuelve un identificador (field) contra el profile a un valor.
export function resolveField(field: string, profile: Profile): unknown {
  const f = field.trim().toLowerCase();
  switch (f) {
    case 'age':
      return profile.age;
    case 'is_minor':
      return profile.age === 'u16';
    case 'climbing_experience_years':
    case 'years_climbing':
      return yearsFromClimbingTime(profile.climbingTime);
    case 'climbing_time':
      return profile.climbingTime;
    case 'injury_active':
      return profile.injuries.length > 0;
    case 'pain_current':
      return hasPain(profile);
    case 'pain_zone':
    case 'current_pain_zone':
    case 'zone':
      return painZones(profile);
    case 'hang_25mm_seconds':
    case 'hang25mm_seconds':
      return profile.hang25mmSeconds;
    case 'maxpullupreps':
    case 'max_pullup_reps':
    case 'pull_ups':
      return profile.maxPullupReps;
    case 'grade_unknown':
      return false;
    case 'hang_unknown':
      return profile.hang25mmSeconds === null;
    case 'condition_current':
      return conditionCurrent(profile);
    case 'comeback_status':
      return conditionCurrent(profile) === 'rebuilding' ? 'returning' : 'stable';
    case 'fatigue_level':
      return profile.fatigueLevel ?? 'unknown';
    case 'red_s_risk':
      return profile.redSLeaFlags ?? false;
    case 'rock_session_planned':
      return false; // Fase 4
    case 'first_session':
      return false; // Fase 4
    case 'sessions_per_week_real':
      return null;
    case 'required_equipment_available':
      return true; // slice de dedos asume gym+hangboard
    // ----- Session-live fields (Fase 4) -----
    // Estos son datos de sesión-en-curso, no de perfil-base. Durante la
    // fase de pool (elegibilidad), asumimos que la sesión los cumple —
    // sino todo el pool queda vacío por warmup pending. En Fase 4, cuando
    // haya sesión persistida, se resuelven contra el estado real.
    case 'warmup_completed':
      return true;
    case 'skin_ok':
    case 'skin_condition_ok':
      return true;
    case 'landing_control':
      return 'good';
    case 'swinging':
      return false;
    case 'post_session_pain':
      return false;
    case 'exercise.risk':
      return null; // se evalúa contra el candidato específico, no aquí
    case 'readiness.fatigue':
      return profile.fatigueLevel ?? 'low';
    default:
      return undefined; // desconocido → clause devuelve unknown
  }
}

// ---------------------------------------------------------------------------
// Parser mini-DSL
// ---------------------------------------------------------------------------

type Value = string | number | boolean | Value[] | null;

/** Parsea `[a, b, c]` a array de strings o numbers. */
function parseList(s: string): Value[] {
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((x) => parseAtom(x.trim()));
}

function parseAtom(s: string): Value {
  const t = s.trim();
  if (!t) return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === 'none' || t === 'None') return null;
  if (t.startsWith('[') && t.endsWith(']')) return parseList(t);
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  const n = Number(t);
  if (Number.isFinite(n) && /^-?\d+(?:\.\d+)?$/.test(t)) return n;
  return t; // string sin comillas → identifier o literal
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

/** Evalúa una cláusula simple `field OP value`. */
function evaluateClause(clause: string, profile: Profile): boolean | 'unknown' {
  const OP_ORDER = ['NOT IN', 'IN', '<=', '>=', '==', '!=', '<', '>', '='];
  let op: string | null = null;
  let left = '';
  let right = '';

  for (const candidate of OP_ORDER) {
    const idx = clause.search(new RegExp(`\\s+${candidate.replace('=', '=')}\\s+|${candidate}`));
    if (idx > 0) {
      const parts = clause.split(new RegExp(`\\s*${candidate}\\s*`));
      if (parts.length === 2) {
        left = parts[0]!.trim();
        right = parts[1]!.trim();
        op = candidate;
        break;
      }
    }
  }

  if (!op) {
    // Sin operador → tratar como boolean field
    const v = resolveField(clause.trim(), profile);
    if (v === undefined) return 'unknown';
    return Boolean(v);
  }

  const leftVal = resolveField(left, profile);
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

/** Evalúa expresión completa con AND/OR. Left-to-right, sin precedencia. */
export function evaluateExpression(
  expr: string, profile: Profile,
): boolean {
  if (!expr.trim()) return false;
  const norm = expr.replace(/\s+/g, ' ').trim();
  // Split por AND / OR conservando operadores
  const tokens = norm.split(/\s+(AND|OR)\s+/i);
  let result: boolean | 'unknown' = evaluateClause(tokens[0]!, profile);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]!.toUpperCase();
    const next = evaluateClause(tokens[i + 1]!, profile);
    const a = result === 'unknown' ? false : result;
    const b = next === 'unknown' ? false : next;
    result = op === 'AND' ? a && b : a || b;
  }
  return result === 'unknown' ? false : result;
}

/**
 * Evalúa un Gate: si condition_expression es true, devuelve GateResult
 * con action + candidateState. Si false, devuelve null (no aplica).
 */
export function evaluateGate(gate: Gate, profile: Profile): GateResult | null {
  const triggered = evaluateExpression(gate.condition, profile);
  if (!triggered) return null;
  const state = ACTION_TO_STATE[gate.action as string] ?? 'MANUAL_REVIEW';
  return {
    gateId: gate.id,
    action: gate.action,
    candidateState: state,
    reason: gate.reason || gate.name,
    isWarning: gate.isWarning,
  };
}
