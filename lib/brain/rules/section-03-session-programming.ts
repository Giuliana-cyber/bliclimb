// Sección 3 del Doc 02 v3 — Reglas de programación de sesión.
//
// Sub-fase 4 propiamente: 11 validadores que operan sobre un TrainingPlan
// ya armado por el LLM (PlanForRules). Sin string matching en ningún lado
// — todos son lookups de enum determinísticos sobre la taxonomía
// consolidada en los dos PRs previos:
//   - week.phase           ∈ {base, build, peak, deload, test}
//   - week.deloadWeek      boolean
//   - session.stimulusCategory + intensityLevel
//   - exercise.stimulusCategory + riskLevel
//
// Reglas implementadas (11 en total):
//   3.1  Orden intra-sesión por intensidad             [blocking]
//   3.2  Skills en primeros ~30% de mainBlock          [blocking]
//   3.3  No 3 días duros consecutivos                  [blocking]
//   3.4  Recuperación entre sesiones del mismo tipo    [blocking]
//   3.6  Strength/power fuera de warmup y cooldown     [blocking]
//   3.7  Semana de descarga cada 8-9 semanas           [blocking]
//   3.8  Orden macro (phase monótona salvo deload)     [blocking]
//   3.9  Anaeróbico requiere 6+ sem. de base aeróbica  [blocking]
//   3.10 Máx 3 días duros/semana                       [blocking]
//   3.20 Máx 2 tipos de alta intensidad por sesión     [blocking]
//   10.6 Alternar heavy/light si 4+ días/semana        [advisory]
//
// Diseño de severity:
//   - blocking → dispara regeneración en el retry loop de generate-plan
//     (a wire-arse en sub-fase final del middleware).
//   - advisory → NO regenera, se pasa como hint al retry prompt o como
//     mensaje al usuario. 10.6 es advisory porque el evidence-base la
//     posiciona como preferencia, no como safety-critical.
//
// Fallback permisivo: cuando una regla depende de un campo estructurado
// que un plan viejo no tiene (ej: exercise.stimulusCategory), la regla NO
// se aplica a ese ejercicio/sesión/semana. Convivencia con planes legacy
// generados antes de sub-fase 4 base.

import { SECTION_03_RULE_SUMMARIES } from '../messages/section-03-programming';
import type {
  PlanForRules,
  PlanRuleId,
  PlanRuleModule,
  PlanSessionForRules,
  PlanViolation,
  PlanWeekForRules
} from '../types';

// -------------------- Helpers --------------------

/**
 * globalDay = índice contiguo del día en el plan completo, asumiendo
 * 7 días por semana. Permite comparar "distancia" entre sesiones a
 * través de fronteras de semana. Ej: (week 2, day 3) → 1*7 + 3 = 10.
 */
function globalDay(weekNumber: number, dayNumber: number): number {
  return (weekNumber - 1) * 7 + dayNumber;
}

/** Todas las sesiones del plan aplanadas y ordenadas por globalDay. */
function flatSessions(
  plan: PlanForRules
): Array<{ week: PlanWeekForRules; session: PlanSessionForRules; gd: number }> {
  const out: Array<{
    week: PlanWeekForRules;
    session: PlanSessionForRules;
    gd: number;
  }> = [];
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      out.push({
        week,
        session,
        gd: globalDay(week.weekNumber, session.dayNumber)
      });
    }
  }
  out.sort((a, b) => a.gd - b.gd);
  return out;
}

/** Constructor de PlanViolation con lookup en messages. */
function makeViolation(
  rule: PlanRuleId,
  section: 'section-03' | 'section-10',
  severity: 'blocking' | 'advisory',
  location: PlanViolation['location'],
  details: PlanViolation['details']
): PlanViolation {
  const summary = SECTION_03_RULE_SUMMARIES[rule];
  return {
    rule,
    section,
    severity,
    location,
    details,
    ruleSummary: summary?.text ?? `Rule ${rule}`,
    source: summary?.source ?? ''
  };
}

// Categorías de "alta intensidad neural" — consumidas por §3.1, §3.6, §3.20.
// Excluye 'power-endurance' de la lista "neural máxima" (esa está separada
// más abajo por §3.4 que le da recuperación distinta) — pero para el conteo
// de §3.20 (máx 2 tipos altos) sí cuenta como alta intensidad.
const HIGH_INTENSITY_STIMULI = new Set([
  'strength',
  'power',
  'power-endurance'
] as const);

type HighIntensityStimulus = 'strength' | 'power' | 'power-endurance';

function isHighIntensity(cat: string | null | undefined): cat is HighIntensityStimulus {
  return cat != null && HIGH_INTENSITY_STIMULI.has(cat as HighIntensityStimulus);
}

// Orden canónico intra-sesión (§3.1). Índice más bajo = va primero (mayor
// calidad neural en estado fresco). Warmup y cooldown NO se rankean acá
// porque viven en bloques separados; esta lista aplica a mainBlock.
const INTRA_SESSION_ORDER: Record<string, number> = {
  skill: 1,
  strength: 2,
  power: 3,
  'power-endurance': 4,
  'aerobic-base': 5,
  mobility: 6,
  mental: 6, // paralelo a mobility
  warmup: 0, // por si aparecen en mainBlock por error, no rompe orden
  cooldown: 7,
  rest: 7
};

// Orden de fases del macrociclo (§3.8). 'deload' y 'test' pueden aparecer
// en cualquier momento (deload cada 8-9, test al final de bloque), por
// eso se manejan con excepciones — no compiten con el orden monótono.
const PHASE_ORDER: Record<string, number> = {
  base: 1,
  build: 2,
  peak: 3
};

// Recuperación mínima entre sesiones del mismo stimulus (§3.4), en DÍAS.
// Doc 02 §3.4:
//   - strength / max-hangs: 48-72h → 2 días
//   - power (boulder límite, campus): 48-72h → 2 días
//   - power-endurance al fallo / 4x4: hasta 5 días → 3 días como mínimo
//     defensivo (no 5 porque bloqueaba demasiado a 3 días/semana con PE)
//   - aerobic-base: ~24h → 1 día
const MIN_RECOVERY_DAYS: Record<string, number> = {
  strength: 2,
  power: 2,
  'power-endurance': 3,
  'aerobic-base': 1
};

// ====================================================================
// 3.1 — Orden intra-sesión por intensidad
// ====================================================================
//
// Dentro de mainBlock, la secuencia de stimulusCategory debe ser
// monotónicamente NO decreciente según INTRA_SESSION_ORDER.
// Fallback permisivo: exercises sin stimulusCategory se saltan.

function check_3_1(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const main = session.mainBlock ?? [];
      const categorized: Array<{ cat: string; idx: number }> = [];
      main.forEach((ex, i) => {
        if (ex?.stimulusCategory) {
          categorized.push({ cat: ex.stimulusCategory, idx: i });
        }
      });
      if (categorized.length < 2) continue;

      let outOfOrder = false;
      for (let i = 1; i < categorized.length; i++) {
        const prev = INTRA_SESSION_ORDER[categorized[i - 1].cat] ?? 5;
        const cur = INTRA_SESSION_ORDER[categorized[i].cat] ?? 5;
        if (cur < prev) {
          outOfOrder = true;
          break;
        }
      }
      if (!outOfOrder) continue;

      out.push(
        makeViolation(
          '3.1',
          'section-03',
          'blocking',
          {
            weekNumber: week.weekNumber,
            dayNumber: session.dayNumber,
            block: 'mainBlock'
          },
          {
            kind: 'session-order-wrong',
            expected: Object.entries(INTRA_SESSION_ORDER)
              .sort((a, b) => a[1] - b[1])
              .map(([k]) => k),
            got: categorized.map((c) => c.cat)
          }
        )
      );
    }
  }
  return out;
}

// ====================================================================
// 3.2 — Skills en primeros ~30% del mainBlock
// ====================================================================
//
// Aprendizaje motor va temprano. Sin duración per-exercise usamos índice
// posicional: skills deben estar en la primera mitad del mainBlock (redondeado
// hacia arriba). Fallback permisivo: mainBlock sin ejercicios categorizados
// no dispara.
//
// Nota: se solapa con 3.1 pero la emitimos independiente porque el retry
// prompt necesita el hint específico "el skill está muy tarde" además del
// hint genérico de orden.

function check_3_2(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const main = session.mainBlock ?? [];
      const skillIndices = main
        .map((ex, i) => (ex?.stimulusCategory === 'skill' ? i : -1))
        .filter((i) => i >= 0);
      if (skillIndices.length === 0) continue;

      const cutoff = Math.ceil(main.length / 2);
      const lateSkill = skillIndices.find((i) => i >= cutoff);
      if (lateSkill === undefined) continue;

      out.push(
        makeViolation(
          '3.2',
          'section-03',
          'blocking',
          {
            weekNumber: week.weekNumber,
            dayNumber: session.dayNumber,
            block: 'mainBlock',
            exerciseIndex: lateSkill
          },
          {
            kind: 'skill-not-in-first-30-min',
            // Sin duración: aproximamos "minutos antes del skill" como
            // (index / total) * estimatedMinutes. Sirve como diagnostic
            // aunque no sea preciso.
            sessionMinutesBeforeSkill: Math.round(
              (lateSkill / Math.max(1, main.length)) *
                (session.estimatedMinutes ?? 60)
            )
          }
        )
      );
    }
  }
  return out;
}

// ====================================================================
// 3.3 — No 3 días duros consecutivos
// ====================================================================
//
// Tres sesiones con intensityLevel==='hard' en días globales estrictamente
// consecutivos. Una sesión no-hard (easy/medium/null) o un día sin sesión
// rompe la secuencia.
//
// Edge cases explícitos:
//   - hard@1, hard@2, hard@3        → violación (3 consecutivos)
//   - hard@1, hard@2, easy@3, hard@4 → NO (easy rompe)
//   - hard@1, hard@2, hard@4        → NO (día 3 gap)

function check_3_3(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const hard = flatSessions(plan).filter(
    (s) => s.session.intensityLevel === 'hard'
  );
  if (hard.length < 3) return out;

  for (let i = 0; i <= hard.length - 3; i++) {
    const a = hard[i];
    const b = hard[i + 1];
    const c = hard[i + 2];
    if (b.gd - a.gd === 1 && c.gd - b.gd === 1) {
      out.push(
        makeViolation(
          '3.3',
          'section-03',
          'blocking',
          { weekNumber: a.week.weekNumber, dayNumber: a.session.dayNumber },
          {
            kind: 'consecutive-hard-days',
            dayNumbers: [a.gd, b.gd, c.gd]
          }
        )
      );
    }
  }
  return out;
}

// ====================================================================
// 3.4 — Recuperación entre sesiones del mismo stimulus
// ====================================================================
//
// Para estímulos con recovery ≥ 48h (strength, power, power-endurance),
// verificar que dos sesiones consecutivas del mismo stimulus están
// separadas por al menos MIN_RECOVERY_DAYS.
//
// Fallback permisivo: sesiones sin stimulusCategory se saltan.

function check_3_4(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const flat = flatSessions(plan);

  for (const stimulus of Object.keys(MIN_RECOVERY_DAYS)) {
    const min = MIN_RECOVERY_DAYS[stimulus];
    const same = flat.filter((s) => s.session.stimulusCategory === stimulus);
    for (let i = 1; i < same.length; i++) {
      const gap = same[i].gd - same[i - 1].gd;
      if (gap < min) {
        out.push(
          makeViolation(
            '3.4',
            'section-03',
            'blocking',
            {
              weekNumber: same[i].week.weekNumber,
              dayNumber: same[i].session.dayNumber
            },
            {
              kind: 'insufficient-recovery-between-sessions',
              stimulus,
              daysBetween: gap,
              minDaysRequired: min,
              dayA: same[i - 1].gd,
              dayB: same[i].gd
            }
          )
        );
      }
    }
  }
  return out;
}

// ====================================================================
// 3.6 — Strength/power/PE fuera de warmup y cooldown
// ====================================================================
//
// Hangboard y equivalentes de fuerza máxima van EN mainBlock, después del
// warmup, y NUNCA en el cooldown (con dedos ya fatigados por la sesión).
// También bloquea strength en warmup (fatiga previa al mainBlock).

function check_3_6(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const check = (
        exs: NonNullable<PlanSessionForRules['warmup']>,
        block: 'warmup' | 'cooldown'
      ) => {
        exs.forEach((ex, i) => {
          if (isHighIntensity(ex?.stimulusCategory)) {
            out.push(
              makeViolation(
                '3.6',
                'section-03',
                'blocking',
                {
                  weekNumber: week.weekNumber,
                  dayNumber: session.dayNumber,
                  block,
                  exerciseIndex: i
                },
                {
                  kind: 'hangboard-after-climb',
                  // Reusamos indices como diagnostic: en cooldown, "hangboard
                  // aparece tras todo el mainBlock". En warmup, invertido.
                  hangboardIndex: i,
                  climbIndex: block === 'cooldown' ? -1 : -2
                }
              )
            );
          }
        });
      };
      if (session.warmup) check(session.warmup, 'warmup');
      if (session.cooldown) check(session.cooldown, 'cooldown');
    }
  }
  return out;
}

// ====================================================================
// 3.7 — Semana de descarga cada 8-9 semanas
// ====================================================================
//
// Tras 9 semanas contiguas sin deload, se emite violation.
// Deload = week.deloadWeek===true OR week.phase==='deload'.
//
// Fallback permisivo: si un plan viejo no tiene phase ni deloadWeek en
// ninguna semana, no podemos saber → la regla no aplica.

function check_3_7(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const MAX_STREAK = 9;

  // Detecta si el plan tiene ALGUNA señal de deload (flag o phase). Si no
  // tiene ninguna, no aplicamos la regla — permisivo con planes viejos.
  const hasAnyDeloadSignal = plan.weeks.some(
    (w) => w.deloadWeek === true || w.phase === 'deload' || w.deloadWeek === false || w.phase != null
  );
  if (!hasAnyDeloadSignal) return out;

  let streak = 0;
  let streakStart = 0;
  for (const week of plan.weeks) {
    const isDeload = week.deloadWeek === true || week.phase === 'deload';
    if (isDeload) {
      streak = 0;
      streakStart = week.weekNumber;
    } else {
      if (streak === 0) streakStart = week.weekNumber;
      streak++;
      if (streak > MAX_STREAK) {
        out.push(
          makeViolation(
            '3.7',
            'section-03',
            'blocking',
            { weekNumber: week.weekNumber },
            {
              kind: 'missing-deload-after-block',
              weeksSinceLastDeload: streak,
              maxAllowed: MAX_STREAK
            }
          )
        );
        break; // una sola violación es suficiente diagnostic
      }
    }
  }
  // silence unused
  void streakStart;
  return out;
}

// ====================================================================
// 3.8 — Orden macro: phase monótono no-decreciente (salvo deload)
// ====================================================================
//
// Iterando por weekNumber: la fase debe seguir base→build→peak. Las
// semanas 'deload' pueden aparecer en cualquier momento y no rompen la
// progresión. 'test' típicamente al final; lo tratamos como > peak (4).

function check_3_8(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const ordered = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  let maxSeen = 0;
  for (const week of ordered) {
    if (!week.phase || week.phase === 'deload') continue;
    const rank = PHASE_ORDER[week.phase] ?? 4;
    if (rank < maxSeen) {
      out.push(
        makeViolation(
          '3.8',
          'section-03',
          'blocking',
          { weekNumber: week.weekNumber },
          {
            kind: 'macro-order-wrong',
            violation: `week ${week.weekNumber} phase '${week.phase}' comes after higher phase`,
            details: `expected monotonic base→build→peak; saw rank ${rank} after max ${maxSeen}`
          }
        )
      );
    }
    if (rank > maxSeen) maxSeen = rank;
  }
  return out;
}

// ====================================================================
// 3.9 — Anaeróbico (power-endurance) requiere 6+ sem. base aeróbica
// ====================================================================
//
// Encuentra la primera semana con al menos una sesión de power-endurance.
// Cuenta semanas ANTES con al menos una sesión aerobic-base. Si < 6 → viola.
//
// Fallback permisivo: si ninguna semana tiene power-endurance, no aplica.

function check_3_9(plan: PlanForRules): PlanViolation[] {
  const ordered = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  // Desactivación para planes <6 semanas (decisión Giuliana 2026-07-13 ·
  // Deuda #14).
  //
  // BilClimb produce planes cortos de guía (2-4 semanas · `planDuration`
  // en `lib/schemas/user-profile.ts:66`). §3.9 fue diseñada para
  // macrociclos serios donde el atleta puede acumular 6 semanas de base
  // aeróbica ANTES de introducir power-endurance — un requisito
  // matemáticamente imposible en planes de 4 semanas.
  //
  // La protección real contra PE en principiantes es §1.2 ampliada:
  // bloquea `power-endurance` como stimulus a nivel de schema para
  // usuarios con climbingTime !== 'more3' (implementado en
  // buildRestrictedFastWeekSchema con blockedStimuli). Los avanzados con
  // 2+ años pueden hacer PE en planes cortos porque tienen la base
  // fisiológica previa (fuera del plan generado por BilClimb).
  //
  // Mantener §3.9 activa para planes cortos haría el permiso a avanzados
  // inútil — el check los bloquearía igual. Decisión: skip para <6 sem.
  if (ordered.length < 6) return [];

  let firstPEWeek = -1;
  let firstPEIdx = -1;
  for (let i = 0; i < ordered.length; i++) {
    const hasPE = ordered[i].sessions.some(
      (s) => s.stimulusCategory === 'power-endurance'
    );
    if (hasPE) {
      firstPEWeek = ordered[i].weekNumber;
      firstPEIdx = i;
      break;
    }
  }
  if (firstPEIdx === -1) return [];

  let aerobicBaseWeeks = 0;
  for (let i = 0; i < firstPEIdx; i++) {
    const hasAero = ordered[i].sessions.some(
      (s) => s.stimulusCategory === 'aerobic-base'
    );
    if (hasAero) aerobicBaseWeeks++;
  }

  const MIN_AEROBIC_WEEKS = 6;
  if (aerobicBaseWeeks >= MIN_AEROBIC_WEEKS) return [];

  return [
    makeViolation(
      '3.9',
      'section-03',
      'blocking',
      { weekNumber: firstPEWeek },
      {
        kind: 'anaerobic-without-aerobic-base',
        firstAnaerobicWeek: firstPEWeek,
        aerobicBaseWeeksBefore: aerobicBaseWeeks,
        minRequired: MIN_AEROBIC_WEEKS
      }
    )
  ];
}

// ====================================================================
// 3.10 — Máx 3 días duros por semana
// ====================================================================

function check_3_10(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const MAX_HARD = 3;
  for (const week of plan.weeks) {
    const hardCount = week.sessions.filter(
      (s) => s.intensityLevel === 'hard'
    ).length;
    if (hardCount > MAX_HARD) {
      out.push(
        makeViolation(
          '3.10',
          'section-03',
          'blocking',
          { weekNumber: week.weekNumber },
          {
            kind: 'too-many-hard-days-per-week',
            hardCount,
            max: MAX_HARD
          }
        )
      );
    }
  }
  return out;
}

// ====================================================================
// 3.20 — Máx 2 tipos de alta intensidad por sesión
// ====================================================================
//
// Cuenta TIPOS DISTINTOS de stimulusCategory ∈ {strength, power,
// power-endurance} en mainBlock (per-exercise). Doc 02 dice "no combinar
// más de DOS tipos" — el axis es TYPES no COUNT de exercises.

function check_3_20(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const MAX_TYPES = 2;
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const types = new Set<HighIntensityStimulus>();
      for (const ex of session.mainBlock ?? []) {
        if (isHighIntensity(ex?.stimulusCategory)) {
          types.add(ex.stimulusCategory as HighIntensityStimulus);
        }
      }
      if (types.size > MAX_TYPES) {
        out.push(
          makeViolation(
            '3.20',
            'section-03',
            'blocking',
            {
              weekNumber: week.weekNumber,
              dayNumber: session.dayNumber,
              block: 'mainBlock'
            },
            {
              kind: 'more-than-two-high-intensity-elements',
              elements: Array.from(types),
              max: MAX_TYPES
            }
          )
        );
      }
    }
  }
  return out;
}

// ====================================================================
// 10.6 — Alternar días pesados/ligeros si 4+ días/semana
// ====================================================================
//
// Para cada semana con 4+ sesiones: no debe haber 2 días 'hard' en dayNumbers
// consecutivos. Advisory — no dispara regeneración pero se reporta como
// hint al usuario/prompt.

function check_10_6(plan: PlanForRules): PlanViolation[] {
  const out: PlanViolation[] = [];
  const MIN_DAYS_FOR_RULE = 4;
  for (const week of plan.weeks) {
    if (week.sessions.length < MIN_DAYS_FOR_RULE) continue;
    const ordered = [...week.sessions].sort((a, b) => a.dayNumber - b.dayNumber);
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1];
      const b = ordered[i];
      if (
        b.dayNumber - a.dayNumber === 1 &&
        a.intensityLevel === 'hard' &&
        b.intensityLevel === 'hard'
      ) {
        out.push(
          makeViolation(
            '10.6',
            'section-10',
            'advisory',
            { weekNumber: week.weekNumber, dayNumber: b.dayNumber },
            {
              kind: 'no-load-alternation',
              daysPerWeek: week.sessions.length,
              consecutiveHeavyDays: [a.dayNumber, b.dayNumber]
            }
          )
        );
      }
    }
  }
  return out;
}

// -------------------- Módulo exportado --------------------

export const section03SessionProgramming: PlanRuleModule = {
  section: 'section-03',
  ruleIds: [
    '3.1',
    '3.2',
    '3.3',
    '3.4',
    '3.6',
    '3.7',
    '3.8',
    '3.9',
    '3.10',
    '3.20'
  ] as const,
  check(plan: PlanForRules): PlanViolation[] {
    return [
      ...check_3_1(plan),
      ...check_3_2(plan),
      ...check_3_3(plan),
      ...check_3_4(plan),
      ...check_3_6(plan),
      ...check_3_7(plan),
      ...check_3_8(plan),
      ...check_3_9(plan),
      ...check_3_10(plan),
      ...check_3_20(plan)
    ];
  }
};

// 10.6 vive en Sección 10 del Doc 02 pero es plan-level, así que la
// exponemos como módulo independiente para que el orquestador pueda
// habilitarla/deshabilitarla por su cuenta.
export const section10LoadAlternation: PlanRuleModule = {
  section: 'section-10',
  ruleIds: ['10.6'] as const,
  check(plan: PlanForRules): PlanViolation[] {
    return check_10_6(plan);
  }
};
