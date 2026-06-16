import type { Session, TrainingPlan, Week, Exercise } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';

export type SafetyViolation = {
  rule: 'no_finger_load_minors' | 'no_max_hangs_with_pain' | 'no_campus_for_beginners';
  reason: string;
  // Para que el reintento le diga al modelo qué eliminar
  forbiddenKeywords: string[];
  // Solo para logging — primer ejercicio donde se detectó
  triggerExercise?: { week: number; day: number; section: string; name: string };
};

export type SafetyResult =
  | { ok: true }
  | { ok: false; violations: SafetyViolation[] };

// Edades menores de 16: no carga directa de dedos
const FINGER_LOAD_KEYWORDS = [
  'hangboard',
  'fingerboard',
  'max hang',
  'max-hang',
  'maxhang',
  'suspension maxima',
  'suspensión máxima',
  'suspensiones maximas',
  'suspensiones máximas',
  'campus',
  'rebote en campus',
  'rebotes en campus',
  'dominadas desiguales',
  'frenchies',
  'regleta',
  'crimp',
  'arqueo'
];

const MAX_HANG_KEYWORDS = [
  'max hang',
  'max-hang',
  'maxhang',
  'suspension maxima',
  'suspensión máxima',
  'suspensiones maximas',
  'suspensiones máximas',
  'hang maximo',
  'hang máximo',
  '100% bw',
  '95% bw',
  '90% bw',
  'fallo en regleta'
];

const CAMPUS_KEYWORDS = [
  'campus',
  'rebote en campus',
  'rebotes en campus',
  'rebotes alcance máximo',
  'rebotes alcance maximo',
  'dominadas desiguales en campus',
  'campus moves',
  'campus board'
];

function normalize(value: string | null | undefined) {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function exerciseHaystack(exercise: Exercise): string {
  return normalize(
    [
      exercise.name,
      exercise.description,
      exercise.objective,
      exercise.prescription,
      exercise.intensity,
      exercise.intensityPercent,
      exercise.rpeTarget,
      exercise.notes,
      exercise.sourceConcept,
      exercise.equipment,
      ...(exercise.requiredEquipment ?? []),
      ...(exercise.howTo ?? []),
      ...(exercise.feelCues ?? []),
      ...(exercise.regressions ?? [])
    ]
      .filter(Boolean)
      .join(' ​ ')
  );
}

function sectionExercises(session: Session): Array<{ section: string; exercise: Exercise }> {
  return [
    ...(session.warmup ?? []).map((e) => ({ section: 'warmup', exercise: e })),
    ...(session.warmupGeneral ?? []).map((e) => ({ section: 'warmupGeneral', exercise: e })),
    ...(session.warmupSpecific ?? []).map((e) => ({ section: 'warmupSpecific', exercise: e })),
    ...(session.mainBlock ?? []).map((e) => ({ section: 'mainBlock', exercise: e })),
    ...(session.finalBlock ?? []).map((e) => ({ section: 'finalBlock', exercise: e })),
    ...(session.cooldown ?? []).map((e) => ({ section: 'cooldown', exercise: e }))
  ];
}

function findForbidden(
  plan: TrainingPlan,
  keywords: string[]
): { week: number; day: number; section: string; name: string } | null {
  const normalizedKeywords = keywords.map(normalize);

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      for (const { section, exercise } of sectionExercises(session)) {
        const haystack = exerciseHaystack(exercise);
        if (!haystack) continue;
        const hit = normalizedKeywords.find((kw) => kw.length > 0 && haystack.includes(kw));
        if (hit) {
          return {
            week: week.weekNumber,
            day: session.dayNumber,
            section,
            name: exercise.name
          };
        }
      }
    }
  }
  return null;
}

/**
 * Reglas de seguridad enforceables server-side.
 * Las reglas son intencionalmente conservadoras: ante la duda, rechazamos.
 */
export function validatePlanSafety(plan: TrainingPlan, profile: UserProfile): SafetyResult {
  const violations: SafetyViolation[] = [];

  // R1 — menores de 16: ninguna carga directa de dedos
  if (profile.age === 'u16') {
    const hit = findForbidden(plan, FINGER_LOAD_KEYWORDS);
    if (hit) {
      violations.push({
        rule: 'no_finger_load_minors',
        reason:
          'El atleta es menor de 16 años. Las epífisis de los dedos aún no maduran y la carga directa (hangboard, campus, max hangs, suspensiones en regleta) tiene riesgo alto de lesión de placa de crecimiento.',
        forbiddenKeywords: FINGER_LOAD_KEYWORDS,
        triggerExercise: hit
      });
    }
  }

  // R2 — dolor de dedos > 3/10: no max hangs
  if ((profile.currentFingerPain ?? 0) > 3) {
    const hit = findForbidden(plan, MAX_HANG_KEYWORDS);
    if (hit) {
      violations.push({
        rule: 'no_max_hangs_with_pain',
        reason: `El atleta reporta dolor de dedos ${profile.currentFingerPain}/10. Las suspensiones máximas pueden agravar tendinopatías activas.`,
        forbiddenKeywords: MAX_HANG_KEYWORDS,
        triggerExercise: hit
      });
    }
  }

  // R3 — tiempo escalando < 1 año: no campus board
  // climbingTime: 'start' (<3 meses) | 'less1' (<1 año) | '1to3' | 'more3'
  const isBeginner = profile.climbingTime === 'start' || profile.climbingTime === 'less1';
  if (isBeginner) {
    const hit = findForbidden(plan, CAMPUS_KEYWORDS);
    if (hit) {
      violations.push({
        rule: 'no_campus_for_beginners',
        reason:
          'El atleta lleva menos de 1 año escalando. El campus board exige tejido conectivo y patrón neuromuscular que aún no está desarrollado a ese nivel; usarlo prematuramente predispone a lesión de poleas y codos.',
        forbiddenKeywords: CAMPUS_KEYWORDS,
        triggerExercise: hit
      });
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

/**
 * Genera el mensaje correctivo para reintento con OpenAI.
 * Lo recibe como user message adicional para que el modelo entienda qué arreglar.
 */
export function buildSafetyRetryMessage(violations: SafetyViolation[]): string {
  const lines: string[] = [
    'El plan que generaste contiene ejercicios PROHIBIDOS para este perfil. Regenera el plan SIN incluir nada de lo siguiente:'
  ];

  violations.forEach((v, i) => {
    lines.push('');
    lines.push(`Regla #${i + 1} (${v.rule}): ${v.reason}`);
    if (v.triggerExercise) {
      lines.push(
        `Detectado en: Semana ${v.triggerExercise.week} · Día ${v.triggerExercise.day} · ${v.triggerExercise.section} · "${v.triggerExercise.name}"`
      );
    }
    lines.push(`PROHIBIDO mencionar (ni siquiera variantes): ${v.forbiddenKeywords.join(', ')}`);
  });

  lines.push('');
  lines.push(
    'Reemplaza esos ejercicios por alternativas seguras y específicas al equipo del atleta. Mantén el resto del plan.'
  );

  return lines.join('\n');
}
