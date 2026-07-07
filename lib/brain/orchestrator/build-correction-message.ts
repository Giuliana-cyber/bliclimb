// Construye el mensaje ESPECÍFICO de corrección para el retry loop.
//
// Formato por diseño (aprobado 2026-07-07):
//   - Ubicación explícita (semana/día/bloque/ejercicio índice) por violation.
//   - Categoría/regla nombrada.
//   - Acción concreta ("quitá / reemplazá / corregí etiqueta").
//   - Agrupado por regla para no dispersar información.
//   - Acotado: máx 5 items por regla; si hay más, "y N más".
//   - Advisory (§10.6) al final, marcado como opcional.
//
// La lógica de over-tag (dar dos salidas a Bill: "quitar" vs "corregir
// etiqueta") vive en la plantilla de §1.gating — ver formatGatedExercise().
//
// Función pura. Consumida por el retry loop.

import type { PlanViolation } from '../types';

const MAX_ITEMS_PER_RULE = 5;

/** Ubicación humana-leíble: "semana 2, día 3, mainBlock, ejercicio 4". */
function formatLocation(v: PlanViolation): string {
  const parts: string[] = [];
  if (v.location.weekNumber !== undefined) parts.push(`semana ${v.location.weekNumber}`);
  if (v.location.dayNumber !== undefined) parts.push(`día ${v.location.dayNumber}`);
  if (v.location.block) parts.push(v.location.block);
  if (v.location.exerciseIndex !== undefined) parts.push(`ejercicio ${v.location.exerciseIndex}`);
  return parts.join(', ');
}

// -------------------- Plantillas por kind --------------------

function formatGatedExercise(v: PlanViolation): string {
  if (v.details.kind !== 'gated-exercise-slipped') return '';
  const { exerciseName, blockedCategory, profileRule } = v.details;
  const ruleTag = profileRule ? ` (§${profileRule})` : '';
  return (
    `- ${formatLocation(v)}: "${exerciseName}" está marcado como '${blockedCategory}', ` +
    `prohibido para este perfil${ruleTag}. Si es '${blockedCategory}' de verdad, ` +
    `QUITALO y reemplazá por una alternativa permitida (skill/mobility/aerobic-base ` +
    `sin carga directa de dedos). Si en realidad NO es '${blockedCategory}' ` +
    `(ej: una movilidad marcada por error como '${blockedCategory}'), CORREGÍ ` +
    `blockCategory a null en la próxima generación — no quites el ejercicio.`
  );
}

function formatSessionOrder(v: PlanViolation): string {
  if (v.details.kind !== 'session-order-wrong') return '';
  return (
    `- ${formatLocation(v)}: el mainBlock tiene el orden ${JSON.stringify(v.details.got)}. ` +
    `Reordená para respetar: skill → strength → power → power-endurance → aerobic-base ` +
    `(los estímulos de alta calidad neural van primero, en estado fresco).`
  );
}

function formatSkillLate(v: PlanViolation): string {
  if (v.details.kind !== 'skill-not-in-first-30-min') return '';
  return (
    `- ${formatLocation(v)}: el skill exercise aparece a los ~${v.details.sessionMinutesBeforeSkill} ` +
    `minutos de sesión. Movelo a la primera mitad del mainBlock (aprendizaje motor va en estado fresco).`
  );
}

function formatConsecutiveHardDays(v: PlanViolation): string {
  if (v.details.kind !== 'consecutive-hard-days') return '';
  return (
    `- Días ${v.details.dayNumbers.join(', ')} son intensityLevel='hard' consecutivos. ` +
    `Cambiá al menos uno del medio a 'easy' o 'medium', o marcalo stimulusCategory='rest'.`
  );
}

function formatInsufficientRecovery(v: PlanViolation): string {
  if (v.details.kind !== 'insufficient-recovery-between-sessions') return '';
  const { stimulus, daysBetween, minDaysRequired, dayA, dayB } = v.details;
  return (
    `- Dos sesiones de '${stimulus}' en días ${dayA} y ${dayB} (gap: ${daysBetween} día/s). ` +
    `Mínimo requerido: ${minDaysRequired} días. Separalas o cambiá el stimulus de una.`
  );
}

function formatHangboardAfterClimb(v: PlanViolation): string {
  if (v.details.kind !== 'hangboard-after-climb') return '';
  return (
    `- ${formatLocation(v)}: un ejercicio strength/power/power-endurance apareció en ` +
    `${v.location.block}. Movelo al mainBlock — nunca cargar dedos al máximo con fatiga previa ` +
    `o después del bloque principal.`
  );
}

function formatMissingDeload(v: PlanViolation): string {
  if (v.details.kind !== 'missing-deload-after-block') return '';
  return (
    `- Semana ${v.location.weekNumber}: llevás ${v.details.weeksSinceLastDeload} semanas ` +
    `sin descarga (máximo permitido: ${v.details.maxAllowed}). Marcá esta semana o una ` +
    `anterior como deloadWeek=true + phase='deload' con volumen reducido ~50%.`
  );
}

function formatMacroOrderWrong(v: PlanViolation): string {
  if (v.details.kind !== 'macro-order-wrong') return '';
  return (
    `- Semana ${v.location.weekNumber}: ${v.details.violation}. ` +
    `${v.details.details}. Reordená las fases: base → build → peak.`
  );
}

function formatAnaerobicWithoutBase(v: PlanViolation): string {
  if (v.details.kind !== 'anaerobic-without-aerobic-base') return '';
  const { firstAnaerobicWeek, aerobicBaseWeeksBefore, minRequired } = v.details;
  return (
    `- Semana ${firstAnaerobicWeek} arranca con power-endurance pero solo hay ` +
    `${aerobicBaseWeeksBefore} semanas de aerobic-base previas (mínimo requerido: ${minRequired}). ` +
    `Postergá el bloque de power-endurance o convertí las primeras semanas en aerobic-base.`
  );
}

function formatTooManyHardDays(v: PlanViolation): string {
  if (v.details.kind !== 'too-many-hard-days-per-week') return '';
  return (
    `- Semana ${v.location.weekNumber}: ${v.details.hardCount} días con intensityLevel='hard' ` +
    `(máximo: ${v.details.max}). Bajá ${v.details.hardCount - v.details.max} a 'medium' o 'easy'.`
  );
}

function formatTooManyHighIntensity(v: PlanViolation): string {
  if (v.details.kind !== 'more-than-two-high-intensity-elements') return '';
  return (
    `- ${formatLocation(v)}: el mainBlock combina ${v.details.elements.length} tipos ` +
    `de alta intensidad (${v.details.elements.join(', ')}). Máximo permitido: ${v.details.max} tipos. ` +
    `Remové al menos uno.`
  );
}

function formatMissingExtensorWork(v: PlanViolation): string {
  if (v.details.kind !== 'missing-extensor-work') return '';
  const reason = v.details.reason === 'epicondylitis-history'
    ? 'este atleta tiene historial de epicondilitis (obligatorio siempre)'
    : `tiene ${v.details.tractionDaysInWeek} días de tracción en la semana`;
  return (
    `- Semana ${v.location.weekNumber}: faltan ejercicios de extensores (${reason}). ` +
    `Agregá al menos 1 exercise con stimulusCategory='mobility' — band pull-aparts, ` +
    `band extensors, o trabajo específico de extensores.`
  );
}

function formatNoAlternation(v: PlanViolation): string {
  if (v.details.kind !== 'no-load-alternation') return '';
  return (
    `- Semana ${v.location.weekNumber}: con ${v.details.daysPerWeek} días/semana, ` +
    `los días ${v.details.consecutiveHeavyDays.join(' y ')} son 'hard' consecutivos. ` +
    `Alterná heavy/light (opcional pero mejor si podés).`
  );
}

function formatOne(v: PlanViolation): string {
  switch (v.details.kind) {
    case 'gated-exercise-slipped': return formatGatedExercise(v);
    case 'session-order-wrong': return formatSessionOrder(v);
    case 'skill-not-in-first-30-min': return formatSkillLate(v);
    case 'consecutive-hard-days': return formatConsecutiveHardDays(v);
    case 'insufficient-recovery-between-sessions': return formatInsufficientRecovery(v);
    case 'hangboard-after-climb': return formatHangboardAfterClimb(v);
    case 'missing-deload-after-block': return formatMissingDeload(v);
    case 'macro-order-wrong': return formatMacroOrderWrong(v);
    case 'anaerobic-without-aerobic-base': return formatAnaerobicWithoutBase(v);
    case 'too-many-hard-days-per-week': return formatTooManyHardDays(v);
    case 'more-than-two-high-intensity-elements': return formatTooManyHighIntensity(v);
    case 'missing-extensor-work': return formatMissingExtensorWork(v);
    case 'no-load-alternation': return formatNoAlternation(v);
    default: return '';
  }
}

// -------------------- Agrupación --------------------

const RULE_HEADINGS: Record<string, string> = {
  '1.gating': 'Ejercicios prohibidos por perfil (§1.1/§1.2)',
  '3.1': 'Orden intra-sesión (§3.1)',
  '3.2': 'Skills tarde en la sesión (§3.2)',
  '3.3': 'Días duros consecutivos (§3.3)',
  '3.4': 'Recuperación insuficiente entre estímulos (§3.4)',
  '3.6': 'Fuerza en warmup/cooldown (§3.6)',
  '3.7': 'Semana de descarga faltante (§3.7)',
  '3.8': 'Orden macro incorrecto (§3.8)',
  '3.9': 'Anaeróbico sin base aeróbica (§3.9)',
  '3.10': 'Demasiados días duros por semana (§3.10)',
  '3.20': 'Demasiados tipos de alta intensidad por sesión (§3.20)',
  '10.6': 'Alternancia de carga (§10.6, opcional)',
  '14.2': 'Trabajo de extensores faltante (§14.2)'
};

function groupByRule(violations: PlanViolation[]): Map<string, PlanViolation[]> {
  const groups = new Map<string, PlanViolation[]>();
  for (const v of violations) {
    const existing = groups.get(v.rule);
    if (existing) existing.push(v);
    else groups.set(v.rule, [v]);
  }
  // Ordenar dentro de cada grupo por (weekNumber, dayNumber, exerciseIndex).
  for (const list of Array.from(groups.values())) {
    list.sort((a, b) => {
      const wa = a.location.weekNumber ?? 0;
      const wb = b.location.weekNumber ?? 0;
      if (wa !== wb) return wa - wb;
      const da = a.location.dayNumber ?? 0;
      const db = b.location.dayNumber ?? 0;
      if (da !== db) return da - db;
      return (a.location.exerciseIndex ?? 0) - (b.location.exerciseIndex ?? 0);
    });
  }
  return groups;
}

// -------------------- API pública --------------------

/**
 * Devuelve un mensaje específico y agrupado listo para inyectar como
 * `retryCorrection` en `generateWeek`. Cubre blocking + advisory
 * (advisory al final, marcado como opcional).
 *
 * Si no hay violations, devuelve string vacío (el caller no debería
 * llamarlo en ese caso, pero es defensivo).
 */
export function buildCorrectionMessage(
  blocking: PlanViolation[],
  advisory: PlanViolation[] = []
): string {
  if (blocking.length === 0 && advisory.length === 0) return '';

  const sections: string[] = [];
  sections.push('El plan tiene ajustes pendientes. Regenerá SOLO las semanas afectadas manteniendo el resto:');

  const blockingGroups = groupByRule(blocking);
  for (const [ruleId, list] of Array.from(blockingGroups.entries())) {
    const heading = RULE_HEADINGS[ruleId] ?? `Regla ${ruleId}`;
    const shown = list.slice(0, MAX_ITEMS_PER_RULE);
    const overflow = list.length - shown.length;
    sections.push(`\n## ${heading}:`);
    for (const v of shown) {
      const line = formatOne(v);
      if (line) sections.push(line);
    }
    if (overflow > 0) {
      sections.push(`- ...y ${overflow} caso/s más de la misma regla en el plan.`);
    }
  }

  if (advisory.length > 0) {
    sections.push('\n## Advisorys (no bloqueantes, aplicalos si podés):');
    const advGroups = groupByRule(advisory);
    for (const [, list] of Array.from(advGroups.entries())) {
      const shown = list.slice(0, MAX_ITEMS_PER_RULE);
      for (const v of shown) {
        const line = formatOne(v);
        if (line) sections.push(line);
      }
    }
  }

  return sections.join('\n');
}
