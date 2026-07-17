/**
 * Motor invertido · restrict-pool · Fase 2.
 *
 * Del pool total de ejercicios, produce la lista de IDs elegibles para
 * un perfil + focus dado, aplicando:
 *   1. Filtro `status === 'active'` (nunca manual_review/draft/deprecated)
 *   2. Filtro `riskLevel <= focus.maxRiskLevel`
 *   3. Evaluación de gates canónicos asociados a cada ejercicio
 *      (via `catalog.exerciseGatesById` que salió del JOIN F1.3)
 *   4. Equipment: el ejercicio requiere equipment ⊆ profile.equipment
 *      (bodyweight `[home]` siempre pasa; sin equipment declarado → pasa)
 *
 * Fail-closed: cualquier duda → excluir. La lista de eligible es la fuente
 * de verdad del `z.enum([...])` del prompt.
 */

import type {
  Catalog, Exercise, Profile, FocusObject, PoolRestrictionResult,
} from './types';
import { evaluateGate } from './gate-evaluator';

const RISK_ORDER: Record<string, number> = {
  'low': 1,
  'low-medium': 2,
  'medium': 3,
  'medium-high': 4,
  'high': 5,
};

function riskWithinMax(risk: string, max: string): boolean {
  const r = RISK_ORDER[risk] ?? 99;
  const m = RISK_ORDER[max] ?? 5;
  return r <= m;
}

function equipmentOk(ex: Exercise, profile: Profile): boolean {
  const eq = ex.equipmentTokens;
  if (eq.length === 0) return true; // sin equipment declarado → pasa
  // Convención bodyweight: [home] sola siempre pasa
  if (eq.length === 1 && eq[0] === 'home') return true;
  const userEq = new Set(profile.equipment);
  return eq.every((t) => userEq.has(t));
}

/**
 * API principal.
 */
export function restrictPool(
  catalog: Catalog,
  candidates: Exercise[],
  profile: Profile,
  focus: FocusObject,
): PoolRestrictionResult {
  const eligible: string[] = [];
  const blocked: { id: string; gateId: string; reason: string }[] = [];
  const reasons = new Map<string, string[]>();

  for (const ex of candidates) {
    const notes: string[] = [];

    // 1. Status
    if (ex.status !== 'active') {
      notes.push(`status=${ex.status}`);
      reasons.set(ex.id, notes);
      continue;
    }
    // 2. Risk
    if (!riskWithinMax(ex.riskLevel, focus.maxRiskLevel)) {
      notes.push(`risk=${ex.riskLevel} > max=${focus.maxRiskLevel}`);
      reasons.set(ex.id, notes);
      continue;
    }
    // 3. Equipment
    if (!equipmentOk(ex, profile)) {
      notes.push(`equipment missing (needs ${ex.equipmentTokens.join(',')})`);
      reasons.set(ex.id, notes);
      continue;
    }
    // 4. Gates asociados
    const gateIds = catalog.exerciseGatesById.get(ex.id) ?? [];
    let blockedByGate = false;
    for (const gid of gateIds) {
      const gate = catalog.gateById.get(gid);
      if (!gate) continue;
      const result = evaluateGate(gate, profile);
      if (!result) continue;
      if (
        result.candidateState === 'BLOCKED' ||
        result.candidateState === 'MANUAL_REVIEW'
      ) {
        blocked.push({ id: ex.id, gateId: gid, reason: result.reason });
        notes.push(`gate=${gid} state=${result.candidateState}`);
        blockedByGate = true;
        break;
      } else if (result.candidateState === 'HELD') {
        notes.push(`gate=${gid} HELD`);
        blockedByGate = true;
        break;
      }
    }
    if (blockedByGate) {
      reasons.set(ex.id, notes);
      continue;
    }

    notes.push('eligible');
    reasons.set(ex.id, notes);
    eligible.push(ex.id);
  }

  return { eligible, blocked, reasons };
}
