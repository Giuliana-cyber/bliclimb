import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';

export type PlanValidationCode =
  | 'WEEKS_TOO_SIMILAR'
  | 'SESSIONS_REPEATED'
  | 'NO_PROGRESSION'
  | 'MISSING_GENERAL_WARMUP'
  | 'MISSING_SPECIFIC_WARMUP'
  | 'MISSING_MAIN_BLOCK'
  | 'MISSING_FINAL_BLOCK'
  | 'MISSING_STOP_IF'
  | 'MISSING_REGRESSION'
  | 'MISSING_SUCCESS_CRITERIA'
  | 'MISSING_ADJUSTMENT_RULES'
  | 'UNSAFE_FINGER_INTENSITY'
  | 'FORBIDDEN_EQUIPMENT'
  | 'CAMPUS_NOT_ALLOWED'
  | 'HANGBOARD_NOT_ALLOWED'
  | 'TOO_GENERIC_DESCRIPTION'
  | 'NOT_SPANISH';

export type PlanValidationError = {
  code: PlanValidationCode;
  message: string;
  path?: string;
};

type ValidationResult = {
  valid: boolean;
  errors: PlanValidationError[];
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
  'moderate pace',
  'dynamic warm'
];

const GENERIC_PATTERNS = [
  'escalada continua',
  'ejercicios de verticalidad',
  'trabajo en presas pequeñas',
  'haz técnica',
  'entrenamiento general',
  'varios ejercicios',
  'según tolerancia'
];

const HIGH_FINGER_LOAD_PATTERNS = [
  'campus',
  'hangboard',
  'fingerboard',
  'tabla multipresa',
  'maxhang',
  'max hangs',
  'hangs máximos',
  'hangs maximos',
  'fallo muscular',
  'arqueo máximo',
  'arqueo maximo',
  'alta intensidad de dedos'
];

const RISK_PATTERNS = [
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAny(text: string, patterns: string[]) {
  const normalizedText = normalizeText(text);
  return patterns.some((pattern) => normalizedText.includes(normalizeText(pattern)));
}

function pushError(errors: PlanValidationError[], code: PlanValidationCode, message: string, path?: string) {
  errors.push({ code, message, path });
}

export function flattenPlanText(plan: TrainingPlan) {
  return [
    plan.objective,
    plan.planVersion,
    plan.mesocycleType,
    plan.planningRationale,
    plan.mainObjective,
    plan.athleteSummary,
    plan.riskSummary,
    plan.equipmentSummary,
    plan.progressionModel,
    plan.weeklyFeedbackPrompt,
    ...(plan.secondaryObjectives ?? []),
    ...(plan.recoveryGuidelines ?? []),
    ...(plan.safetyRules ?? []),
    ...(plan.microcycles ?? []).flatMap((microcycle) => [
      microcycle.id,
      microcycle.objective,
      microcycle.loadLevel,
      microcycle.progressionFocus
    ]),
    ...plan.weeks.flatMap((week) => [
      week.theme,
      week.objective,
      week.microcycle,
      week.progression,
      week.progressionFocus,
      week.loadLevel,
      week.deloadFocus,
      ...week.focusAreas,
      ...week.sessions.flatMap((session) => [
        session.title,
        session.stimulusType,
        session.location,
        ...(session.equipment ?? []),
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
          exercise.category,
          ...(exercise.requiredEquipment ?? []),
          exercise.prescription,
          exercise.reps,
          exercise.duration,
          exercise.rest,
          exercise.intensity,
          exercise.intensityPercent,
          exercise.rpeTarget,
          exercise.notes,
          exercise.objective,
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
  const parsedScore = Number(profile.currentFingerPain ?? 0);

  if (Number.isFinite(parsedScore) && parsedScore > 0) return parsedScore;

  const injuryText = `${profile.injuryDescription} ${profile.injuryNotes}`.toLowerCase();
  return profile.injuries.includes('fingers') || injuryText.includes('dedo') ? 1 : 0;
}

function hasDose(exercise: TrainingPlan['weeks'][number]['sessions'][number]['mainBlock'][number]) {
  return Boolean(
    exercise.prescription ||
      exercise.sets ||
      exercise.reps ||
      exercise.duration ||
      exercise.timerSeconds ||
      exercise.rest ||
      exercise.intensity ||
      exercise.intensityPercent ||
      exercise.rpeTarget
  );
}

function getExerciseText(exercise: TrainingPlan['weeks'][number]['sessions'][number]['mainBlock'][number]) {
  return [
    exercise.name,
    exercise.description,
    exercise.category,
    exercise.objective,
    exercise.prescription,
    exercise.equipment,
    exercise.sourceConcept,
    ...(exercise.requiredEquipment ?? [])
  ].join(' ');
}

function getSessionSignature(session: TrainingPlan['weeks'][number]['sessions'][number]) {
  return [
    session.stimulusType,
    ...session.mainBlock.map((exercise) => normalizeText(exercise.name)).sort()
  ]
    .filter(Boolean)
    .join('|');
}

function getWeekSignature(week: TrainingPlan['weeks'][number]) {
  return week.sessions.map(getSessionSignature).join('||');
}

function validateLanguage(planText: string, errors: PlanValidationError[]) {
  ENGLISH_PATTERNS.forEach((pattern) => {
    if (includesAny(planText, [pattern])) {
      pushError(errors, 'NOT_SPANISH', `Texto en inglés detectado: "${pattern}".`);
    }
  });
}

function validateEquipment(plan: TrainingPlan, profile: UserProfile, errors: PlanValidationError[]) {
  const planText = flattenPlanText(plan);
  const hasGym = profile.equipment.includes('gym');
  const hasCampus = profile.equipment.includes('campus') || profile.accessToCampusBoard;
  const hasHangboard = profile.equipment.includes('hangboard') || profile.accessToHangboard;
  const hasWeights = profile.equipment.includes('weights') || profile.accessToWeights;

  if (!hasGym && includesAny(planText, ['climbing gym', 'muro indoor', 'boulder indoor', 'gimnasio de escalada'])) {
    pushError(errors, 'FORBIDDEN_EQUIPMENT', 'Usa gym/muro aunque el perfil no tiene acceso.');
  }
  if (!hasCampus && includesAny(planText, ['campus board', 'campus'])) {
    pushError(errors, 'CAMPUS_NOT_ALLOWED', 'Usa campus aunque el perfil no tiene campus permitido.');
  }
  if (!hasHangboard && includesAny(planText, ['hangboard', 'fingerboard', 'tabla multipresa'])) {
    pushError(errors, 'HANGBOARD_NOT_ALLOWED', 'Usa hangboard aunque el perfil no tiene hangboard permitido.');
  }
  if (!hasWeights && includesAny(planText, ['mancuernas', 'kettlebell', 'barra con peso', 'pesas', 'gym de pesas'])) {
    pushError(errors, 'FORBIDDEN_EQUIPMENT', 'Usa pesas aunque el perfil no tiene pesas disponibles.');
  }
}

function validateStructure(plan: TrainingPlan, errors: PlanValidationError[]) {
  if (!plan.mesocycleType || !plan.mainObjective || !plan.progressionModel) {
    pushError(errors, 'NO_PROGRESSION', 'Falta mesociclo, objetivo principal o modelo de progresión.');
  }

  plan.weeks.forEach((week) => {
    const weekPath = `weeks.${week.weekNumber}`;

    if (!week.microcycleId && !week.microcycle) {
      pushError(errors, 'NO_PROGRESSION', `Semana ${week.weekNumber}: falta microciclo.`, weekPath);
    }
    if (!week.progressionFocus && !week.progression) {
      pushError(errors, 'NO_PROGRESSION', `Semana ${week.weekNumber}: falta foco de progresión.`, weekPath);
    }

    week.sessions.forEach((session) => {
      const path = `${weekPath}.sessions.${session.dayNumber}`;

      if (!session.warmupGeneral?.length) {
        pushError(errors, 'MISSING_GENERAL_WARMUP', `Semana ${week.weekNumber}, día ${session.dayNumber}: falta calentamiento general.`, path);
      }
      if (!session.warmupSpecific?.length) {
        pushError(errors, 'MISSING_SPECIFIC_WARMUP', `Semana ${week.weekNumber}, día ${session.dayNumber}: falta calentamiento específico.`, path);
      }
      if (!session.mainBlock.length) {
        pushError(errors, 'MISSING_MAIN_BLOCK', `Semana ${week.weekNumber}, día ${session.dayNumber}: falta parte principal.`, path);
      }
      if (!session.finalBlock?.length) {
        pushError(errors, 'MISSING_FINAL_BLOCK', `Semana ${week.weekNumber}, día ${session.dayNumber}: falta parte final.`, path);
      }
      if (!session.successCriteria?.length) {
        pushError(errors, 'MISSING_SUCCESS_CRITERIA', `Semana ${week.weekNumber}, día ${session.dayNumber}: faltan criterios de éxito.`, path);
      }
      if (!session.adjustmentRules?.length) {
        pushError(errors, 'MISSING_ADJUSTMENT_RULES', `Semana ${week.weekNumber}, día ${session.dayNumber}: faltan reglas de ajuste.`, path);
      }

      [
        ...session.warmup,
        ...(session.warmupGeneral ?? []),
        ...(session.warmupSpecific ?? []),
        ...session.mainBlock,
        ...(session.finalBlock ?? []),
        ...session.cooldown
      ].forEach((exercise, index) => {
        const exercisePath = `${path}.exercise.${index}`;
        const description = `${exercise.name} ${exercise.description}`;

        if (!exercise.description || exercise.description.trim().length < 80 || !exercise.howTo?.length || !hasDose(exercise)) {
          pushError(errors, 'TOO_GENERIC_DESCRIPTION', `${exercise.name}: falta descripción accionable, dosis o howTo.`, exercisePath);
        }
        if (includesAny(description, GENERIC_PATTERNS)) {
          pushError(errors, 'TOO_GENERIC_DESCRIPTION', `${exercise.name}: descripción demasiado genérica.`, exercisePath);
        }
        if (!exercise.stopIf?.length) {
          pushError(errors, 'MISSING_STOP_IF', `${exercise.name}: falta stopIf.`, exercisePath);
        }
        if (includesAny(getExerciseText(exercise), RISK_PATTERNS) && !exercise.regressions?.length) {
          pushError(errors, 'MISSING_REGRESSION', `${exercise.name}: ejercicio de riesgo sin regresión.`, exercisePath);
        }
      });
    });
  });
}

function validateVariation(plan: TrainingPlan, errors: PlanValidationError[]) {
  plan.weeks.forEach((week) => {
    const signatures = week.sessions.map(getSessionSignature);
    const uniqueSignatures = new Set(signatures);

    if (week.sessions.length > 1 && uniqueSignatures.size === 1) {
      pushError(errors, 'SESSIONS_REPEATED', `Semana ${week.weekNumber}: sesiones idénticas.`);
    }

    signatures.forEach((signature, index) => {
      if (index > 0 && signature === signatures[index - 1]) {
        pushError(errors, 'SESSIONS_REPEATED', `Semana ${week.weekNumber}: repite sesión consecutiva.`);
      }
    });
  });

  const weekSignatures = plan.weeks.map(getWeekSignature);
  const uniqueWeeks = new Set(weekSignatures);

  if (plan.weeks.length >= 3 && uniqueWeeks.size < Math.ceil(plan.weeks.length * 0.75)) {
    pushError(errors, 'WEEKS_TOO_SIMILAR', 'Las semanas son demasiado parecidas.');
  }

  const allSessionSignatures = plan.weeks.flatMap((week) => week.sessions.map(getSessionSignature));
  if (
    allSessionSignatures.length >= 4 &&
    new Set(allSessionSignatures).size < Math.ceil(allSessionSignatures.length * 0.65)
  ) {
    pushError(errors, 'SESSIONS_REPEATED', 'El plan repite demasiadas sesiones entre semanas.');
  }
}

function validateSafety(plan: TrainingPlan, profile: UserProfile, errors: PlanValidationError[]) {
  const planText = flattenPlanText(plan);
  const fingerPain = getFingerPainScore(profile);
  const canUseCampus = profile.accessToCampusBoard && profile.campusExperience !== 'none' && fingerPain === 0;
  const canUseHangboard = profile.accessToHangboard && profile.fingerTrainingExperience !== 'none';

  if (fingerPain > 0 && includesAny(planText, HIGH_FINGER_LOAD_PATTERNS)) {
    pushError(errors, 'UNSAFE_FINGER_INTENSITY', 'Hay dolor de dedos y el plan incluye campus, hangboard intenso, fallo o alta intensidad.');
  }
  if (!canUseCampus && includesAny(planText, ['campus'])) {
    pushError(errors, 'CAMPUS_NOT_ALLOWED', 'Campus no permitido por dolor, equipo o experiencia.');
  }
  if (!canUseHangboard && includesAny(planText, ['hangboard', 'fingerboard', 'tabla multipresa'])) {
    pushError(errors, 'HANGBOARD_NOT_ALLOWED', 'Hangboard no permitido por equipo o experiencia.');
  }
}

export function validateProfessionalPlan(plan: TrainingPlan, profile: UserProfile): ValidationResult {
  const errors: PlanValidationError[] = [];
  const planText = flattenPlanText(plan);

  validateLanguage(planText, errors);
  validateEquipment(plan, profile, errors);
  validateStructure(plan, errors);
  validateVariation(plan, errors);
  validateSafety(plan, profile, errors);

  const dedupedErrors = Array.from(
    new Map(errors.map((error) => [`${error.code}:${error.message}:${error.path ?? ''}`, error])).values()
  );

  return {
    valid: dedupedErrors.length === 0,
    errors: dedupedErrors,
    violations: dedupedErrors.map((error) => `${error.code}: ${error.message}`)
  };
}
