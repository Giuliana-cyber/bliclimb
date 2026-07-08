// Post-procesador determinístico del plan generado por OpenAI.
//
// Diseñado como parte de la Opción 6 del fix bug #2 del audit-360.
// La lección del smoke test anterior: pedirle al LLM que respete reglas
// estructurales duras (§3.1 orden, §3.2 skills primero, §3.6 no hangboard
// en warmup, §14.2 extensores obligatorios) no funciona — el LLM las
// ignora o las viola más en el retry. La estrategia acá es:
//
//   1. §3.6 se garantiza en el propio schema restringido (WarmupStimulusSchema,
//      CooldownStimulusSchema) — OpenAI rechaza en generación.
//   2. §3.1 (orden intra-mainBlock) → reorderMainBlockBySafety.
//   3. §3.2 (skills primera mitad) → queda cubierto por §3.1 porque skill=1 en
//      INTRA_SESSION_ORDER, o sea el reorderamiento naturalmente los deja adelante.
//   4. §14.2 (extensor work obligatorio) → ensureExtensorWork inyecta si falta.
//
// Las funciones son puras: reciben la week/session, devuelven versión nueva.
// El LLM sigue haciendo lo que hace bien (contenido de ejercicios, howTo,
// cues, tono). El motor arregla la estructura después.

import type {
  FastSession,
  FastWeek,
  MainBlockExercise,
  CooldownExercise
} from './fast-plan-schema';

// Alineado con INTRA_SESSION_ORDER de lib/brain/rules/section-03-session-programming.ts.
// Si esa constante cambia, hay que actualizar acá también (deuda: extraer a un
// módulo compartido cuando aterrice más lógica común).
const INTRA_SESSION_ORDER: Record<string, number> = {
  skill: 1,
  strength: 2,
  power: 3,
  'power-endurance': 4,
  'aerobic-base': 5,
  mobility: 6
};

/**
 * §3.1 · Reordena mainBlock por INTRA_SESSION_ORDER (monotónica no-decreciente).
 *
 * Preserva 100% del contenido de cada exercise (nombre, howTo, cues, sets, reps,
 * blockCategory) — solo cambia el orden del array. Stable sort para que ejercicios
 * de la misma categoría mantengan orden relativo original.
 *
 * §3.2 (skills en primera mitad) queda cubierto porque skill=1 es el orden más
 * bajo; naturalmente termina al frente.
 */
export function reorderMainBlockBySafety(session: FastSession): FastSession {
  // Zod infer los items como MainBlockExercise; solo los que tienen categoría
  // conocida se ordenan por INTRA_SESSION_ORDER, el resto va al final.
  const indexed = session.mainBlock.map((ex, i) => ({ ex, i }));
  indexed.sort((a, b) => {
    const oa = INTRA_SESSION_ORDER[a.ex.stimulusCategory] ?? 99;
    const ob = INTRA_SESSION_ORDER[b.ex.stimulusCategory] ?? 99;
    if (oa !== ob) return oa - ob;
    // Stable: mismo orden que en el array original si tienen el mismo rank.
    return a.i - b.i;
  });
  return { ...session, mainBlock: indexed.map((x) => x.ex) };
}

// -------------------- §14.2 · Extensor work obligatorio --------------------

const TRACTION_STIMULI = new Set<string>([
  'strength',
  'power',
  'power-endurance',
  'aerobic-base'
]);

function isTractionSession(session: FastSession): boolean {
  return TRACTION_STIMULI.has(session.stimulusCategory);
}

function weekHasMobility(week: FastWeek): boolean {
  for (const session of week.sessions) {
    for (const ex of session.warmup) {
      if (ex.stimulusCategory === 'mobility') return true;
    }
    for (const ex of session.mainBlock) {
      if (ex.stimulusCategory === 'mobility') return true;
    }
    for (const ex of session.cooldown) {
      if (ex.stimulusCategory === 'mobility') return true;
    }
  }
  return false;
}

/**
 * Ejercicio default inyectado por ensureExtensorWork.
 *
 * Texto aprobado por Giuliana. Voz `tú` (LATAM neutro) — el sweep vos→tú de
 * la Fase 5 no puede reintroducirse acá. Notes en voz de coach, no de sistema.
 *
 * Es un CooldownExercise porque se inyecta en el cooldown; el schema con
 * stimulusCategory='mobility' es aceptado por CooldownStimulusSchema.
 */
export const DEFAULT_EXTENSOR_EXERCISE: CooldownExercise = {
  name: 'Band pull-aparts para extensores',
  description: 'Trabajo específico de extensores para prevención de epicondilitis.',
  sets: 3,
  reps: '15',
  rest: '30 seg',
  intensity: 'RPE 5-6',
  notes:
    'Agrego esto porque tu semana carga mucho los flexores. Los extensores mantienen el codo sano.',
  alternative: 'Wrist curl inverso con mancuerna liviana (2-3 kg) — 3x15 por brazo.',
  equipment: 'Banda elástica',
  riskLevel: 'bajo',
  stimulusCategory: 'mobility',
  blockCategory: null,
  howTo: [
    'Toma una banda elástica con ambas manos frente a ti, brazos extendidos a la altura del pecho, palmas hacia abajo.',
    'Separa las manos hacia afuera manteniendo los brazos rectos, apretando las escápulas al final del movimiento.',
    'Vuelve al inicio con control, sin dejar que la banda te tire hacia adelante.',
    'Haz 15 repeticiones lentas por serie, prioriza la calidad de contracción sobre la velocidad.'
  ],
  cues: [
    'El trabajo debe ir a la espalda alta y hombros posteriores, no a los brazos.',
    'Mantén el cuello relajado y las orejas alejadas de los hombros durante todo el movimiento.',
    'Si sientes la muñeca cargada, gira las palmas para que miren al techo.'
  ],
  commonMistakes: [
    'Usar una banda demasiado dura y compensar arqueando la espalda o adelantando el cuello.',
    'Hacer las repeticiones rápido perdiendo la contracción final entre escápulas.'
  ]
};

/**
 * §14.2 · Garantiza al menos 1 exercise mobility por semana cuando el perfil
 * lo requiere.
 *
 * Umbrales (alineados con lib/brain/rules/section-14-elbow-prevention.ts):
 *   - profile.injuries incluye 'elbows' → threshold = 1 sesión de tracción.
 *   - Sin historial → threshold = 3 sesiones de tracción.
 *
 * Si ya existe algún exercise con stimulusCategory='mobility' en la semana,
 * no hace nada (idempotente). Si no, inyecta DEFAULT_EXTENSOR_EXERCISE en el
 * cooldown de la sesión con menor estimatedMinutes.
 */
export function ensureExtensorWork(
  week: FastWeek,
  profile: { injuries?: string[] }
): FastWeek {
  const hasEpicondylitis =
    profile.injuries?.some((i) => i.toLowerCase() === 'elbows') ?? false;
  const tractionSessions = week.sessions.filter(isTractionSession).length;
  const threshold = hasEpicondylitis ? 1 : 3;

  // No aplica la regla.
  if (tractionSessions < threshold) return week;
  // Ya cumplido.
  if (weekHasMobility(week)) return week;

  // Sin sesiones no hay dónde inyectar.
  if (week.sessions.length === 0) return week;

  // Elegimos la sesión con menor estimatedMinutes para no sobrecargar una
  // sesión ya larga. Empate → primera en el orden del array.
  let targetIdx = 0;
  let minMinutes = week.sessions[0].estimatedMinutes;
  for (let i = 1; i < week.sessions.length; i++) {
    if (week.sessions[i].estimatedMinutes < minMinutes) {
      minMinutes = week.sessions[i].estimatedMinutes;
      targetIdx = i;
    }
  }

  const target = week.sessions[targetIdx];
  const injected: FastSession = {
    ...target,
    cooldown: [...target.cooldown, DEFAULT_EXTENSOR_EXERCISE]
  };
  const newSessions = [...week.sessions];
  newSessions[targetIdx] = injected;
  return { ...week, sessions: newSessions };
}

/**
 * Pipeline completo: se aplica a cada semana post-generación.
 * §3.6 ya está garantizada por el schema restringido; acá cubrimos §3.1/§3.2
 * (reordenamiento) y §14.2 (inyección).
 *
 * Idempotente: aplicarlo dos veces devuelve el mismo resultado.
 */
export function postProcessWeek(
  week: FastWeek,
  profile: { injuries?: string[] }
): FastWeek {
  const withReorder: FastWeek = {
    ...week,
    sessions: week.sessions.map(reorderMainBlockBySafety)
  };
  return ensureExtensorWork(withReorder, profile);
}

// Utilidad para instrumentación: cuenta violaciones agrupadas por rule id.
// Reusado por el log 'plan_violations_summary' en el route handler.
export function countViolationsByRule(
  violations: Array<{ rule: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of violations) {
    counts[v.rule] = (counts[v.rule] ?? 0) + 1;
  }
  return counts;
}
