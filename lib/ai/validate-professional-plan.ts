import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';

type ValidationResult = {
  valid: boolean;
  violations: string[];
};

const ENGLISH_PATTERNS = [
  'warmup',
  'cooldown',
  'main block',
  'climbing gym',
  'workout',
  'sets of',
  'easy pace',
  'moderate pace'
];

const RISK_EXERCISE_PATTERNS = [
  'dedo',
  'dedos',
  'regleta',
  'colgada',
  'suspension',
  'suspensión',
  'hangboard',
  'fingerboard',
  'campus',
  'dominada',
  'traccion',
  'tracción',
  'hombro',
  'codo',
  'barra'
];

const HIGH_FINGER_LOAD_PATTERNS = [
  'campus',
  'hangboard',
  'fingerboard',
  'maxhang',
  'max hangs',
  'hangs maximos',
  'hangs máximos',
  'fallo muscular',
  'arqueo maximo',
  'arqueo máximo',
  'alta intensidad de dedos'
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textIncludesAny(text: string, patterns: string[]) {
  const normalizedText = normalizeText(text);
  return patterns.some((pattern) => normalizedText.includes(normalizeText(pattern)));
}

function flattenPlanText(plan: TrainingPlan) {
  return [
    plan.objective,
    plan.mesocycleType,
    plan.mainObjective,
    plan.athleteSummary,
    plan.riskSummary,
    plan.equipmentSummary,
    plan.weeklyFeedbackPrompt,
    ...(plan.secondaryObjectives ?? []),
    ...(plan.recoveryGuidelines ?? []),
    ...(plan.safetyRules ?? []),
    ...plan.weeks.flatMap((week) => [
      week.theme,
      week.microcycle,
      week.progression,
      week.deloadFocus,
      ...week.focusAreas,
      ...week.sessions.flatMap((session) => [
        session.title,
        session.location,
        session.objective,
        session.why,
        session.intensityTarget,
        session.nutritionTip,
        session.source,
        ...(session.safetyNotes ?? []),
        ...(session.adjustmentRules ?? []),
        ...(session.successCriteria ?? []),
        ...[
          ...session.warmup,
          ...(session.warmupGeneral ?? []),
          ...(session.warmupSpecific ?? []),
          ...session.mainBlock,
          ...(session.finalBlock ?? []),
          ...session.cooldown
        ].flatMap((exercise) => [
          exercise.name,
          exercise.description,
          exercise.reps,
          exercise.rest,
          exercise.intensity,
          exercise.notes,
          exercise.objective,
          exercise.duration,
          exercise.intensityPercent,
          exercise.tempo,
          exercise.alternative,
          exercise.equipment,
          exercise.sourceConcept,
          ...(exercise.howTo ?? []),
          ...(exercise.feelCues ?? []),
          ...(exercise.commonMistakes ?? []),
          ...(exercise.stopIf ?? []),
          ...(exercise.regressions ?? []),
          ...(exercise.progressions ?? [])
        ])
      ])
    ])
  ]
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .join(' ');
}

function getFingerPainScore(profile: UserProfile) {
  const extendedProfile = profile as UserProfile & { currentFingerPain?: number | string };
  const parsedScore = Number(extendedProfile.currentFingerPain ?? 0);

  if (Number.isFinite(parsedScore) && parsedScore > 0) {
    return parsedScore;
  }

  const injuryText = `${profile.injuryDescription} ${profile.injuryNotes}`.toLowerCase();

  return profile.injuries.includes('fingers') || injuryText.includes('dedo') ? 1 : 0;
}

function getUnavailableEquipmentViolations(planText: string, profile: UserProfile) {
  const violations: string[] = [];
  const equipment = new Set(profile.equipment);
  const extendedProfile = profile as UserProfile & {
    accessToCampusBoard?: boolean;
    accessToHangboard?: boolean;
    accessToWeights?: boolean;
  };

  const hasGym = equipment.has('gym');
  const hasCampus = equipment.has('campus') || extendedProfile.accessToCampusBoard === true;
  const hasHangboard = equipment.has('hangboard') || extendedProfile.accessToHangboard === true;
  const hasWeights = equipment.has('weights') || extendedProfile.accessToWeights === true;

  if (!hasGym && textIncludesAny(planText, ['climbing gym', 'muro indoor', 'boulder indoor', 'gimnasio de escalada'])) {
    violations.push('usa gym/muro indoor aunque el perfil no tiene gym');
  }

  if (!hasCampus && textIncludesAny(planText, ['campus board', 'campus'])) {
    violations.push('usa campus board aunque el perfil no tiene campus');
  }

  if (!hasHangboard && textIncludesAny(planText, ['hangboard', 'fingerboard', 'tabla multipresa', 'maxhang', 'colgadas en regleta'])) {
    violations.push('usa hangboard/fingerboard aunque el perfil no tiene hangboard');
  }

  if (!hasWeights && textIncludesAny(planText, ['mancuernas', 'kettlebell', 'barra con peso', 'pesas', 'gym de pesas'])) {
    violations.push('usa pesas aunque el perfil no tiene gym de pesas');
  }

  return violations;
}

function hasDose(exercise: TrainingPlan['weeks'][number]['sessions'][number]['mainBlock'][number]) {
  return Boolean(
    exercise.sets ||
      exercise.reps ||
      exercise.duration ||
      exercise.timerSeconds ||
      exercise.rest ||
      exercise.intensity ||
      exercise.intensityPercent
  );
}

function getSessionSignature(session: TrainingPlan['weeks'][number]['sessions'][number]) {
  return session.mainBlock.map((exercise) => normalizeText(exercise.name)).sort().join('|');
}

export function validateProfessionalPlan(plan: TrainingPlan, profile: UserProfile): ValidationResult {
  const violations: string[] = [];
  const planText = flattenPlanText(plan);

  ENGLISH_PATTERNS.forEach((pattern) => {
    if (normalizeText(planText).includes(normalizeText(pattern))) {
      violations.push(`usa texto en inglés: "${pattern}"`);
    }
  });

  if (!plan.mesocycleType || !plan.mainObjective) {
    violations.push('falta mesocycleType o mainObjective');
  }

  if (!plan.recoveryGuidelines?.length) {
    violations.push('falta recoveryGuidelines');
  }

  if (!plan.weeklyFeedbackPrompt) {
    violations.push('falta weeklyFeedbackPrompt');
  }

  if (!plan.safetyRules?.length) {
    violations.push('falta safetyRules');
  }

  plan.weeks.forEach((week) => {
    if (!week.microcycle && !week.progression) {
      violations.push(`Semana ${week.weekNumber}: falta microciclo o progresión clara`);
    }

    week.sessions.forEach((session) => {
      const label = `Semana ${week.weekNumber}, día ${session.dayNumber}`;

      if (!session.warmupGeneral?.length || !session.warmupSpecific?.length) {
        violations.push(`${label}: falta calentamiento general o específico`);
      }

      if (!session.mainBlock.length || !session.finalBlock?.length) {
        violations.push(`${label}: falta parte principal o parte final`);
      }

      if (!session.objective || !session.why || !session.intensityTarget) {
        violations.push(`${label}: falta objetivo, por qué existe o intensidad objetivo`);
      }

      if (!session.safetyNotes?.length || !session.adjustmentRules?.length || !session.successCriteria?.length) {
        violations.push(`${label}: faltan notas de seguridad, reglas de ajuste o criterios de éxito`);
      }

      [
        ...session.warmup,
        ...(session.warmupGeneral ?? []),
        ...(session.warmupSpecific ?? []),
        ...session.mainBlock,
        ...(session.finalBlock ?? []),
        ...session.cooldown
      ].forEach((exercise) => {
        const exerciseLabel = `${label}: "${exercise.name}"`;
        const exerciseText = [
          exercise.name,
          exercise.description,
          exercise.objective,
          exercise.equipment,
          exercise.sourceConcept
        ].join(' ');

        if (!exercise.description || exercise.description.trim().length < 80 || !exercise.howTo?.length) {
          violations.push(`${exerciseLabel}: faltan instrucciones accionables`);
        }

        if (!hasDose(exercise)) {
          violations.push(`${exerciseLabel}: falta dosis, duración, descanso o intensidad`);
        }

        if (!exercise.stopIf?.length) {
          violations.push(`${exerciseLabel}: falta stopIf`);
        }

        if (textIncludesAny(exerciseText, RISK_EXERCISE_PATTERNS) && !exercise.regressions?.length) {
          violations.push(`${exerciseLabel}: ejercicio de riesgo sin regressions`);
        }
      });
    });

    const signatures = week.sessions.map(getSessionSignature);
    const uniqueSignatures = new Set(signatures);

    if (week.sessions.length > 1 && uniqueSignatures.size === 1) {
      violations.push(`Semana ${week.weekNumber}: repite sesiones idénticas`);
    }
  });

  const allSignatures = plan.weeks.flatMap((week) => week.sessions.map(getSessionSignature));

  if (allSignatures.length >= 4 && new Set(allSignatures).size < Math.ceil(allSignatures.length * 0.6)) {
    violations.push('el plan repite demasiadas sesiones entre semanas');
  }

  if (getFingerPainScore(profile) > 0 && textIncludesAny(planText, HIGH_FINGER_LOAD_PATTERNS)) {
    violations.push('hay dolor de dedos y el plan incluye campus, hangs máximos, fallo o alta intensidad de dedos');
  }

  return {
    valid: violations.length === 0,
    violations: Array.from(new Set([...violations, ...getUnavailableEquipmentViolations(planText, profile)]))
  };
}
