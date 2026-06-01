import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { NextResponse } from 'next/server';
import { requireSubscriptionAccess } from '@/lib/billing/subscription';
import { buildPlanGeneratorPrompt } from '@/lib/prompts/plan-generator';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { WeekSchema } from '@/lib/ai/training-plan-schema';
import { extractLibraryTraceability, type LibraryTraceability } from '@/lib/ai/response-sources';
import { validateProfessionalPlan } from '@/lib/ai/validate-professional-plan';
import { getLowQualityReasons, scorePlanQuality } from '@/lib/ai/score-plan-quality';
import {
  buildPlanSkeleton,
  type PlanSkeleton,
  type SkeletonExerciseCandidate,
  type WeekSkeleton
} from '@/lib/planning/build-plan-skeleton';
import {
  OPENAI_RATE_LIMIT_MESSAGE,
  isOpenAIRateLimitError,
  withOpenAIRetry
} from '@/lib/ai/openai-retry';
import {
  PLAN_SESSION_MAX_OUTPUT_TOKENS,
  PLAN_SKELETON_MAX_OUTPUT_TOKENS
} from '@/lib/ai/token-budget';
import type { ProfileAnalysis } from '@/lib/planning/profile-analysis';
import type { PlanTemplate } from '@/lib/planning/plan-templates';

export const runtime = 'nodejs';

const MAX_PLAN_GENERATION_ATTEMPTS = 2;
const MAX_STRUCTURED_SESSIONS = 20;
const PERSONALIZED_STRUCTURED_SESSION_LIMIT = 24;
const DAYS_BY_COUNT = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

type ExerciseDraft = Omit<
  TrainingPlan['weeks'][number]['sessions'][number]['warmup'][number],
  'sets' | 'reps' | 'rest' | 'intensity' | 'timerSeconds'
> & {
  sets?: number | null;
  reps?: string | null;
  rest?: string | null;
  intensity?: string | null;
  timerSeconds?: number | null;
};

type SessionKind =
  | 'rockTechnique'
  | 'rockVolume'
  | 'rockProject'
  | 'rockRecovery'
  | 'gymTechnique'
  | 'gymVolume'
  | 'gymProject'
  | 'gymRecovery'
  | 'homeStrength'
  | 'homeCore'
  | 'homeMovement'
  | 'homeRecovery';

const weekBlueprints = [
  {
    theme: 'base técnica y control',
    focusAreas: ['técnica de pies', 'control corporal', 'volumen submáximo']
  },
  {
    theme: 'volumen y eficiencia',
    focusAreas: ['resistencia aeróbica', 'descansos activos', 'economía de movimiento']
  },
  {
    theme: 'intensidad controlada y proyecto',
    focusAreas: ['movimientos clave', 'fuerza submáxima', 'simulación de crux']
  },
  {
    theme: 'descarga y consolidación',
    focusAreas: ['recuperación', 'movilidad', 'técnica fácil']
  }
];

const CONDITIONING_KEYWORDS = {
  core: ['core', 'plancha', 'hollow', 'dead bug', 'abdomen', 'tensión corporal', 'tension corporal'],
  traction: ['tracción', 'traccion', 'dominada', 'remo', 'barra', 'escapular', 'escápula', 'hombro'],
  antagonist: ['antagonista', 'extensores', 'banda', 'aperturas de dedos', 'antebrazo'],
  legs: ['sentadilla', 'estocada', 'zancada', 'piernas', 'cadera', 'glúteo', 'gluteo'],
  endurance: ['resistencia', 'continuidad', 'aeróbica', 'aerobica', 'circuito', 'volumen submáximo'],
  mobility: ['movilidad', 'torácica', 'toracica', 'rotación', 'rotacion', 'vuelta a la calma']
};

const PERSONALIZATION_STOP_WORDS = new Set([
  'para',
  'porque',
  'quiero',
  'busco',
  'mejorar',
  'tener',
  'hacer',
  'como',
  'pero',
  'este',
  'esta',
  'esto',
  'algo',
  'todo',
  'todos',
  'todas',
  'entrenar',
  'entrenamiento',
  'escalada',
  'escalar',
  'nivel',
  'plan',
  'mes',
  'semana',
  'semanas',
  'dias',
  'día',
  'con',
  'sin',
  'una',
  'uno',
  'las',
  'los',
  'del',
  'que',
  'por'
]);

function isAdvancedProfile(profile: UserProfile) {
  return profile.level === 'advanced' || profile.level === 'elite';
}

function hasLoadRestriction(profile: UserProfile) {
  const injuryText = `${profile.injuryDescription} ${profile.injuryNotes}`.toLowerCase();

  return (
    profile.injuries.some((injury) => injury !== 'none') ||
    Boolean(injuryText.trim()) ||
    profile.currentFingerPain > 0 ||
    profile.currentShoulderPain > 0 ||
    profile.currentElbowPain > 0 ||
    profile.wantsConservativePlan ||
    profile.trainingAggressiveness === 'conservative' ||
    profile.energyLevel === 'low' ||
    profile.energy === 'low' ||
    profile.sleepQuality === 'bad' ||
    profile.sleep === 'bad'
  );
}

function hasDetailedOnboardingContext(profile: UserProfile) {
  const freeTextLength = [
    profile.goalDescription,
    profile.projectDescription,
    profile.project,
    profile.trainingHistory,
    profile.previousTraining,
    profile.equipmentNotes,
    profile.injuryDescription
  ]
    .filter(Boolean)
    .join(' ')
    .trim().length;

  return isAdvancedProfile(profile) || freeTextLength >= 80 || profile.goals.length > 1;
}

function getProfileLevelLabel(profile: UserProfile) {
  const labels: Record<string, string> = {
    none: 'sin nivel declarado',
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
    elite: 'élite'
  };

  return labels[profile.level] ?? profile.level ?? 'sin nivel declarado';
}

function getProfileContextSummary(profile: UserProfile) {
  return [
    `nivel ${getProfileLevelLabel(profile)}`,
    profile.goalDescription ? `objetivo: ${profile.goalDescription}` : null,
    profile.projectDescription || profile.project
      ? `proyecto: ${profile.projectDescription || profile.project}`
      : null,
    profile.trainingHistory ? `historial: ${profile.trainingHistory}` : null
  ]
    .filter(Boolean)
    .join(' · ');
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Partial<UserProfile>;
  const hasGoal =
    Boolean(profile.goal) ||
    Boolean(Array.isArray(profile.goals) && profile.goals.length) ||
    Boolean(profile.goalDescription?.trim());

  return Boolean(
    profile.id &&
      profile.character &&
      profile.climbingTime &&
      hasGoal &&
      profile.planDuration &&
      profile.daysPerWeek
  );
}

function normalizePlan(
  plan: TrainingPlan,
  profile: UserProfile,
  libraryTraceability?: LibraryTraceability,
  skeleton?: PlanSkeleton
): TrainingPlan {
  const now = new Date().toISOString();
  const skeletonWeeks = skeleton?.weeks ?? [];

  return {
    ...plan,
    id: plan.id || crypto.randomUUID(),
    profileId: profile.id,
    planVersion: skeleton?.planVersion ?? plan.planVersion ?? 'planner-v1',
    mesocycleType: skeleton?.mesocycleType ?? plan.mesocycleType,
    microcycles: skeleton?.microcycles ?? plan.microcycles,
    planningRationale: skeleton?.planningRationale ?? plan.planningRationale,
    progressionModel: skeleton?.progressionModel ?? plan.progressionModel,
    totalWeeks: profile.planDuration,
    currentWeek: plan.currentWeek || 1,
    status: 'active',
    createdAt: plan.createdAt || now,
    startDate: plan.startDate || now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? plan.usedFileSearch,
    librarySources: libraryTraceability?.sourceNames.length
      ? libraryTraceability.sourceNames
      : plan.librarySources,
    weeks: plan.weeks.map((week, weekIndex) => {
      const skeletonWeek = skeletonWeeks[weekIndex];

      return {
        ...week,
        microcycleId: skeletonWeek?.microcycleId ?? week.microcycleId,
        objective: skeletonWeek?.objective ?? week.objective,
        microcycle: skeletonWeek?.objective ?? week.microcycle,
        progression: skeletonWeek?.progressionFocus ?? week.progression,
        progressionFocus: skeletonWeek?.progressionFocus ?? week.progressionFocus,
        loadLevel: skeletonWeek?.loadLevel ?? week.loadLevel,
        deloadWeek: skeletonWeek?.deloadWeek ?? week.deloadWeek,
        sessions: week.sessions.map((session, sessionIndex) => {
          const skeletonSession = skeletonWeek?.sessions[sessionIndex];

          return {
            ...session,
            stimulusType: skeletonSession?.stimulusType ?? session.stimulusType,
            location: skeletonSession?.location ?? session.location,
            equipment:
              skeletonSession?.exerciseCandidates
                .flatMap((exercise) => exercise.requiredEquipment)
                .filter(Boolean) ?? session.equipment,
            estimatedDurationMinutes:
              skeletonSession?.estimatedDurationMinutes ?? session.estimatedDurationMinutes,
            objective: skeletonSession?.objective ?? session.objective,
            why: skeletonSession?.why ?? session.why,
            intensityTarget: skeletonSession?.intensityTarget ?? session.intensityTarget,
            safetyNotes: skeletonSession?.safetyNotes ?? session.safetyNotes,
            adjustmentRules: skeletonSession?.adjustmentRules ?? session.adjustmentRules,
            successCriteria: skeletonSession?.successCriteria ?? session.successCriteria,
            completed: false,
            checkIn: null
          };
        })
      };
    })
  };
}

function flattenPlanText(plan: TrainingPlan) {
  return plan.weeks
    .flatMap((week) => [
      week.theme,
      week.objective,
      week.progressionFocus,
      week.loadLevel,
      ...week.focusAreas,
      ...week.sessions.flatMap((session) => [
        session.title,
        session.stimulusType,
        session.location,
        ...(session.equipment ?? []),
        session.nutritionTip,
        session.source,
        ...session.warmup.flatMap((exercise) => Object.values(exercise)),
        ...session.mainBlock.flatMap((exercise) => Object.values(exercise)),
        ...session.cooldown.flatMap((exercise) => Object.values(exercise))
      ])
    ])
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .join(' ')
    .toLowerCase();
}

function getUnavailableEquipmentViolations(plan: TrainingPlan, profile: UserProfile) {
  const text = flattenPlanText(plan);
  const violations: string[] = [];

  const unavailablePatterns = [
    {
      available: profile.equipment.includes('gym'),
      label: 'gym de escalada',
      patterns: ['climbing gym', 'gimnasio de escalada', 'muro indoor', 'boulder indoor']
    },
    {
      available: profile.equipment.includes('hangboard'),
      label: 'hangboard',
      patterns: ['hangboard', 'fingerboard', 'beastmaker', 'tabla multipresa', 'maxhang']
    },
    {
      available: profile.equipment.includes('campus'),
      label: 'campus board',
      patterns: ['campus board', 'campus']
    },
    {
      available: profile.equipment.includes('weights'),
      label: 'gym de pesas',
      patterns: ['barbell', 'dumbbell', 'kettlebell', 'mancuerna', 'mancuernas', 'barra con peso', 'máquina de pesas']
    }
  ];

  unavailablePatterns.forEach((item) => {
    if (!item.available && item.patterns.some((pattern) => text.includes(pattern))) {
      violations.push(item.label);
    }
  });

  if (!profile.equipment.includes('gym')) {
    const hasGymLocation = plan.weeks.some((week) =>
      week.sessions.some((session) => session.location.toLowerCase() === 'gym')
    );

    if (hasGymLocation) {
      violations.push('ubicación gym');
    }
  }

  return Array.from(new Set(violations));
}

function getDetailViolations(plan: TrainingPlan) {
  const violations: string[] = [];

  plan.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      const label = `Semana ${week.weekNumber}, día ${session.dayNumber}`;

      if (session.warmup.length < 3) {
        violations.push(`${label}: calentamiento con menos de 3 ejercicios`);
      }

      if (session.mainBlock.length < 3) {
        violations.push(`${label}: bloque principal con menos de 3 ejercicios`);
      }

      if (session.cooldown.length < 2) {
        violations.push(`${label}: vuelta a la calma con menos de 2 ejercicios`);
      }

      if (!session.source || session.source.trim().length < 10) {
        violations.push(`${label}: falta una fuente o criterio de entrenamiento útil`);
      }

      [...session.warmup, ...session.mainBlock, ...session.cooldown].forEach((exercise) => {
        if (exercise.description.trim().length < 120) {
          violations.push(`${label}: "${exercise.name}" no explica suficientemente qué hacer`);
        }

        if (!exercise.notes || exercise.notes.trim().length < 40) {
          violations.push(`${label}: "${exercise.name}" necesita una nota técnica o ajuste`);
        }
      });
    });
  });

  return violations;
}

function getLanguageViolations(plan: TrainingPlan) {
  const text = flattenPlanText(plan);
  const englishPatterns = [
    'warmup',
    'cooldown',
    'workout',
    'training session',
    'climbing gym',
    'rest day',
    'easy pace',
    'moderate pace',
    'sets of',
    'reps of'
  ];

  return englishPatterns
    .filter((pattern) => text.includes(pattern))
    .map((pattern) => `usa texto en inglés: "${pattern}"`);
}

function getSafetyViolations(plan: TrainingPlan, profile: UserProfile) {
  const text = flattenPlanText(plan);
  const violations: string[] = [];
  const isMinor = profile.age === 'u16';
  const isNewerClimber = profile.climbingTime === 'start' || profile.climbingTime === 'less1';
  const hasInjury =
    profile.injuries.some((injury) => injury !== 'none') ||
    Boolean(profile.injuryDescription.trim() || profile.injuryNotes.trim());
  const fingerLoadPatterns = ['hangboard', 'fingerboard', 'campus', 'maxhang', 'colgadas'];
  const weightPatterns = ['mancuerna', 'mancuernas', 'barra con peso', 'kettlebell', 'pesas'];

  if ((isMinor || isNewerClimber) && fingerLoadPatterns.some((pattern) => text.includes(pattern))) {
    violations.push('incluye carga avanzada de dedos para menor o escalador principiante');
  }

  if (isMinor && weightPatterns.some((pattern) => text.includes(pattern))) {
    violations.push('incluye pesas para perfil menor de 16 años');
  }

  if (hasInjury && !text.includes('fisio') && !text.includes('fisioterapeuta')) {
    violations.push('hay lesión/molestia y el plan no indica consultar a fisio');
  }

  const longestSession = Math.max(
    ...plan.weeks.flatMap((week) => week.sessions.map((session) => session.estimatedMinutes)),
    0
  );

  if (profile.sessionDuration > 0 && longestSession > profile.sessionDuration + 15) {
    violations.push(
      `incluye sesiones de hasta ${longestSession} min aunque el perfil reporta ${profile.sessionDuration} min`
    );
  }

  return violations;
}

function normalizeTextKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSessionMainSignature(session: TrainingPlan['weeks'][number]['sessions'][number]) {
  return session.mainBlock.map((exercise) => normalizeTextKey(exercise.name)).sort().join('|');
}

function getPlanVarietyViolations(plan: TrainingPlan) {
  const violations: string[] = [];
  const sessions = plan.weeks.flatMap((week) =>
    week.sessions.map((session) => ({
      weekNumber: week.weekNumber,
      session
    }))
  );

  if (sessions.length < 2) {
    return violations;
  }

  const signatures = sessions.map(({ session }) => getSessionMainSignature(session));
  const uniqueSignatures = new Set(signatures).size;
  const minimumUniqueSessions = Math.min(sessions.length, Math.max(3, Math.ceil(sessions.length * 0.65)));

  if (uniqueSignatures < minimumUniqueSessions) {
    violations.push(
      `hay demasiadas sesiones repetidas: ${uniqueSignatures} variantes de bloque principal para ${sessions.length} sesiones`
    );
  }

  plan.weeks.forEach((week) => {
    const weeklySignatures = week.sessions.map(getSessionMainSignature);
    const repeatedInWeek = weeklySignatures.some(
      (signature, index) => signature && weeklySignatures.indexOf(signature) !== index
    );

    if (repeatedInWeek) {
      violations.push(`Semana ${week.weekNumber}: repite el mismo bloque principal en más de una sesión`);
    }
  });

  const mainExerciseCounts = new Map<string, number>();

  sessions.forEach(({ session }) => {
    const namesInSession = new Set(session.mainBlock.map((exercise) => normalizeTextKey(exercise.name)));
    namesInSession.forEach((name) => {
      mainExerciseCounts.set(name, (mainExerciseCounts.get(name) ?? 0) + 1);
    });
  });

  const overusedExercises = Array.from(mainExerciseCounts.entries())
    .filter(([, count]) => count >= Math.max(3, Math.ceil(sessions.length * 0.55)))
    .map(([name]) => name);

  if (overusedExercises.length) {
    violations.push(
      `repite ejercicios principales demasiadas veces: ${overusedExercises.slice(0, 3).join(', ')}`
    );
  }

  return violations;
}

function getConditioningCategoriesForText(text: string) {
  const normalizedText = normalizeTextKey(text);

  return Object.entries(CONDITIONING_KEYWORDS)
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalizedText.includes(normalizeTextKey(keyword)))
    )
    .map(([category]) => category);
}

function getExerciseConditioningCategories(exercise: TrainingPlan['weeks'][number]['sessions'][number]['mainBlock'][number]) {
  return getConditioningCategoriesForText(
    [
      exercise.name,
      exercise.description,
      exercise.objective,
      exercise.notes,
      exercise.equipment
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function getPhysicalConditioningViolations(plan: TrainingPlan) {
  const violations: string[] = [];

  plan.weeks.forEach((week) => {
    const weeklyCategories = new Set<string>();
    let sessionsWithConditioning = 0;

    week.sessions.forEach((session) => {
      const sessionMainCategories = new Set(
        session.mainBlock.flatMap((exercise) => getExerciseConditioningCategories(exercise))
      );

      sessionMainCategories.forEach((category) => weeklyCategories.add(category));

      if (sessionMainCategories.size > 0) {
        sessionsWithConditioning += 1;
      }
    });

    const minimumConditioningSessions = Math.min(week.sessions.length, 2);

    if (sessionsWithConditioning < minimumConditioningSessions) {
      violations.push(
        `Semana ${week.weekNumber}: falta acondicionamiento físico en el bloque principal de al menos ${minimumConditioningSessions} sesiones`
      );
    }

    if (weeklyCategories.size < 2) {
      violations.push(
        `Semana ${week.weekNumber}: falta variedad de acondicionamiento físico (core, tracción/escápulas, antagonistas, piernas/cadera o movilidad)`
      );
    }
  });

  return violations;
}

function getProfileKeywords(profile: UserProfile) {
  const sourceText = [
    profile.goalDescription,
    profile.projectDescription,
    profile.project,
    profile.trainingHistory,
    profile.equipmentNotes
  ]
    .filter(Boolean)
    .join(' ');

  return Array.from(
    new Set(
      normalizeTextKey(sourceText)
        .split(' ')
        .filter((word) => word.length >= 5 && !PERSONALIZATION_STOP_WORDS.has(word))
    )
  ).slice(0, 14);
}

function getPersonalizationViolations(plan: TrainingPlan, profile: UserProfile) {
  const violations: string[] = [];
  const text = flattenPlanText(plan);
  const normalizedText = normalizeTextKey(text);
  const mainText = normalizeTextKey(
    plan.weeks
      .flatMap((week) =>
        week.sessions.flatMap((session) => [
          session.title,
          session.source,
          ...session.mainBlock.flatMap((exercise) => [
            exercise.name,
            exercise.description,
            exercise.objective,
            exercise.notes,
            exercise.reps,
            exercise.intensity
          ])
        ])
      )
      .filter(Boolean)
      .join(' ')
  );

  if (isAdvancedProfile(profile) && !hasLoadRestriction(profile)) {
    const beginnerPatterns = [
      'dominada asistida',
      'dominadas asistidas',
      'pies apoyados',
      'suspension asistida',
      'principiante'
    ];
    const matchedBeginnerPatterns = beginnerPatterns.filter((pattern) =>
      mainText.includes(normalizeTextKey(pattern))
    );

    if (matchedBeginnerPatterns.length) {
      violations.push(
        `perfil ${getProfileLevelLabel(profile)} sin restricción fuerte: evita regresiones de principiante (${matchedBeginnerPatterns
          .slice(0, 3)
          .join(', ')})`
      );
    }

    const advancedPatterns = [
      'proyecto',
      'crux',
      'beta',
      'tension',
      'potencia',
      'resistencia',
      'intervalo',
      'bloque',
      'coordinacion',
      'traccion estricta',
      'tempo',
      'submaxima'
    ];

    if (!advancedPatterns.some((pattern) => mainText.includes(normalizeTextKey(pattern)))) {
      violations.push(
        `perfil ${getProfileLevelLabel(profile)}: el bloque principal no refleja trabajo avanzado, proyecto, tensión, potencia, resistencia o beta`
      );
    }
  }

  const keywords = getProfileKeywords(profile);

  if (keywords.length >= 4) {
    const matchedKeywords = keywords.filter((keyword) => normalizedText.includes(keyword));
    const minimumMatches = Math.min(4, Math.max(2, Math.ceil(keywords.length * 0.25)));

    if (matchedKeywords.length < minimumMatches) {
      violations.push(
        `el plan casi no usa el contexto escrito del onboarding; debe incorporar objetivo/proyecto/historial del usuario`
      );
    }
  }

  return violations;
}

function getPlanValidationViolations(plan: TrainingPlan, profile: UserProfile) {
  return Array.from(new Set([
    ...getLanguageViolations(plan),
    ...getUnavailableEquipmentViolations(plan, profile),
    ...getDetailViolations(plan),
    ...getSafetyViolations(plan, profile),
    ...getPlanVarietyViolations(plan),
    ...getPhysicalConditioningViolations(plan),
    ...getPersonalizationViolations(plan, profile),
    ...validateProfessionalPlan(plan, profile).violations
  ]));
}

function withQualityScores(plan: TrainingPlan, profile: UserProfile): TrainingPlan {
  const qualityScores = scorePlanQuality(plan, profile);
  return {
    ...plan,
    qualityScores
  };
}

function getQualityViolations(plan: TrainingPlan, profile: UserProfile) {
  const scores = plan.qualityScores ?? scorePlanQuality(plan, profile);

  return getLowQualityReasons(scores).map((reason) => `QUALITY_SCORE_LOW: ${reason}`);
}

function toExercise(exercise: ExerciseDraft): TrainingPlan['weeks'][number]['sessions'][number]['warmup'][number] {
  const riskText = `${exercise.name} ${exercise.description} ${exercise.equipment ?? ''}`.toLowerCase();
  const riskLevel =
    exercise.riskLevel ??
    (['dedo', 'regleta', 'campus', 'hangboard', 'codo', 'hombro', 'barra', 'tracción', 'traccion'].some((term) =>
      riskText.includes(term)
    )
      ? 'medio'
      : 'bajo');

  return {
    category: exercise.category ?? null,
    requiredEquipment: exercise.requiredEquipment ?? (exercise.equipment ? [exercise.equipment] : []),
    prescription:
      exercise.prescription ??
      ([exercise.sets ? `${exercise.sets} series` : null, exercise.reps ?? exercise.duration, exercise.rest ? `descanso ${exercise.rest}` : null]
        .filter(Boolean)
        .join(' · ') ||
        null),
    sets: exercise.sets ?? null,
    reps: exercise.reps ?? null,
    rest: exercise.rest ?? null,
    intensity: exercise.intensity ?? null,
    timerSeconds: exercise.timerSeconds ?? null,
    duration: exercise.duration ?? exercise.reps ?? null,
    intensityPercent: exercise.intensityPercent ?? null,
    rpeTarget: exercise.rpeTarget ?? exercise.intensity ?? null,
    tempo: exercise.tempo ?? null,
    regressions: exercise.regressions ?? [exercise.alternative ?? 'Reduce rango, volumen o intensidad manteniendo técnica limpia.'],
    progressions: exercise.progressions ?? ['Aumenta solo una variable cuando termines con técnica limpia y margen.'],
    videoUrl: exercise.videoUrl ?? null,
    sourceConcept: exercise.sourceConcept ?? exercise.objective ?? 'Principio BilClimb de carga progresiva y técnica segura.',
    riskLevel,
    ...exercise
  };
}

function getWeekBlueprint(weekNumber: number) {
  return weekBlueprints[(weekNumber - 1) % weekBlueprints.length];
}

function isDownloadWeek(weekNumber: number) {
  return weekNumber % 4 === 0;
}

function getSessionKind(profile: UserProfile, weekNumber: number, sessionIndex: number): SessionKind {
  const phaseIndex = (weekNumber - 1) % 4;
  const hasRock = profile.equipment.includes('rock');
  const hasGym = profile.equipment.includes('gym');

  if (sessionIndex === 0 && hasRock) {
    return (['rockTechnique', 'rockVolume', 'rockProject', 'rockRecovery'] as const)[phaseIndex];
  }

  if (sessionIndex === 0 && hasGym) {
    return (['gymTechnique', 'gymVolume', 'gymProject', 'gymRecovery'] as const)[phaseIndex];
  }

  if (isDownloadWeek(weekNumber)) {
    return sessionIndex % 2 === 0 ? 'homeRecovery' : 'homeMovement';
  }

  if (sessionIndex % 3 === 0) {
    return 'homeMovement';
  }

  if (sessionIndex % 3 === 1) {
    return 'homeStrength';
  }

  return 'homeCore';
}

function getSessionLocation(kind: SessionKind) {
  if (kind.startsWith('rock')) {
    return 'roca';
  }

  if (kind.startsWith('gym')) {
    return 'gym';
  }

  return 'casa';
}

function getSessionTitle(kind: SessionKind, dayLabel: string, weekNumber: number) {
  const labels: Record<SessionKind, string> = {
    rockTechnique: 'técnica de pies en roca',
    rockVolume: 'continuidad submáxima en roca',
    rockProject: 'simulación de proyecto en roca',
    rockRecovery: 'roca fácil y descarga técnica',
    gymTechnique: 'técnica y control en muro',
    gymVolume: 'resistencia en muro',
    gymProject: 'boulder controlado y proyecto',
    gymRecovery: 'muro fácil y movilidad',
    homeStrength: 'fuerza base en casa',
    homeCore: 'core y tensión corporal',
    homeMovement: 'técnica sin muro y movilidad',
    homeRecovery: 'recuperación activa'
  };

  return `${dayLabel}: ${labels[kind]} · semana ${weekNumber}`;
}

function makeWarmupExercises(profile: UserProfile, kind: SessionKind, weekNumber: number) {
  const hasBands = profile.equipment.includes('bands');
  const useBandFingerWarmup = hasBands && !isDownloadWeek(weekNumber);
  const isClimbingDay = kind.startsWith('rock') || kind.startsWith('gym');
  const isStrengthDay = kind === 'homeStrength' || kind === 'gymProject' || kind === 'rockProject';

  return [
    toExercise({
      name: isDownloadWeek(weekNumber)
        ? 'Movilidad suave de descarga'
        : 'Movilidad general de hombros y cadera',
      description:
        'Haz círculos controlados de hombros, muñecas, cadera y tobillos. Mantén respiración nasal suave y aumenta el rango poco a poco sin rebotes ni dolor.',
      reps: '6 a 8 repeticiones por dirección',
      rest: 'Sin descanso largo',
      intensity: 'Muy suave',
      notes:
        'Debe sentirse como lubricación articular, no como estiramiento intenso. Si algo pincha, reduce rango.',
      objective: 'Subir temperatura y preparar articulaciones para moverse con control.',
      howTo: [
        'Empieza por cuello, hombros y muñecas',
        'Sigue con cadera, rodillas y tobillos',
        'Usa rango cómodo y lento'
      ],
      feelCues: ['Calor ligero', 'Respiración tranquila', 'Movimiento más fluido'],
      commonMistakes: ['Rebotar', 'Forzar rango', 'Mover rápido sin control'],
      stopIf: ['Dolor punzante', 'Mareo', 'Hormigueo'],
      alternative: 'Camina 5 minutos y repite solo las articulaciones que se sientan rígidas.',
      equipment: 'sin equipo'
    }),
    toExercise({
      name: useBandFingerWarmup ? 'Aperturas de dedos con banda' : 'Aperturas activas de dedos',
      description: useBandFingerWarmup
        ? 'Coloca una banda ligera alrededor de los dedos y abre la mano de forma lenta. Vuelve al centro controlando la banda sin cerrar con fuerza.'
        : 'Abre y cierra los dedos lentamente, separándolos lo más posible sin tensión. Mantén muñeca neutra y hombros relajados.',
      sets: 2,
      reps: '12 a 15 repeticiones',
      rest: '30 segundos',
      intensity: 'Suave',
      notes:
        'Busca activar extensores y antebrazo sin fatigar. Si los dedos duelen, baja tensión o hazlo sin banda.',
      objective: 'Activar extensores de dedos y equilibrar la carga de agarre.',
      howTo: ['Muñeca neutra', 'Abre dedos lento', 'Regresa sin golpear la banda'],
      feelCues: ['Trabajo leve en dorso de mano', 'Antebrazo despierto', 'Cero dolor articular'],
      commonMistakes: ['Usar banda muy dura', 'Doblar la muñeca', 'Ir al fallo'],
      stopIf: ['Dolor de dedos sube a 3/10', 'Dolor punzante', 'Pérdida de control'],
      alternative: 'Haz aperturas sin banda o masaje suave de antebrazo.',
      equipment: useBandFingerWarmup ? 'bandas elásticas' : 'sin equipo'
    }),
    toExercise({
      name: isClimbingDay
        ? 'Ensayo de pies silenciosos en el suelo'
        : isStrengthDay
          ? 'Activación escapular de pie'
          : 'Respiración con tensión corporal suave',
      description: isClimbingDay
        ? 'Camina sobre una línea imaginaria apoyando primero el dedo gordo y luego el resto del pie. Practica mirar el apoyo antes de mover la mano para llegar a la roca o muro con precisión.'
        : isStrengthDay
          ? 'De pie, lleva hombros suavemente hacia atrás y abajo, como si guardaras las escápulas en los bolsillos. Mantén costillas bajas y cuello largo.'
          : 'Acuéstate boca arriba, exhala largo y activa abdomen sin despegar la espalda baja. Mantén cuello relajado y siente control antes de moverte.',
      sets: 2,
      reps: isClimbingDay ? '2 minutos' : '8 a 10 repeticiones',
      rest: '30 segundos',
      intensity: 'Suave a moderada',
      notes: isClimbingDay
        ? 'Este ejercicio cambia el foco del calentamiento: hoy la calidad de pies importa más que hacer fuerza.'
        : 'No arquees la espalda ni contengas la respiración. El movimiento debe sentirse estable y limpio.',
      objective: isClimbingDay
        ? 'Preparar precisión de pies y atención visual antes de escalar.'
        : 'Preparar hombros, costillas y abdomen para moverse con control.',
      howTo: isClimbingDay
        ? ['Mira el apoyo', 'Pisa silencioso', 'Traslada peso lento']
        : ['Costillas abajo', 'Respira lento', 'Activa sin rigidez'],
      feelCues: isClimbingDay
        ? ['Pies precisos', 'Cadera estable', 'Menos prisa']
        : ['Centro activo', 'Cuello relajado', 'Hombros estables'],
      commonMistakes: isClimbingDay
        ? ['Pisar fuerte', 'Mirar tarde', 'Correr el movimiento']
        : ['Arquear lumbar', 'Encoger hombros', 'Apretar mandíbula'],
      stopIf: ['Dolor punzante', 'Mareo', 'Pérdida de control'],
      alternative: 'Haz marcha suave con respiración nasal si necesitas bajar intensidad.',
      equipment: 'sin equipo'
    })
  ];
}

function makeConditioningExercise(profile: UserProfile, weekNumber: number, sessionIndex: number, kind: SessionKind) {
  const hasBands = profile.equipment.includes('bands');
  const hasPullupBar = profile.equipment.includes('pullup_bar');
  const advanced = isAdvancedProfile(profile);
  const fingerPainContext =
    profile.injuries.includes('fingers') || profile.injuryDescription.toLowerCase().includes('dedo');
  const option = (weekNumber + sessionIndex) % 5;

  if (isDownloadWeek(weekNumber)) {
    return toExercise({
      name: 'Acondicionamiento suave de recuperación',
      description:
        'Haz una ronda tranquila de movilidad torácica, respiración y activación ligera de abdomen. Mantén todo en RPE bajo para salir con menos tensión de la que empezaste.',
      sets: 2,
      reps: '6 a 8 repeticiones por movimiento',
      rest: '45 segundos',
      intensity: 'Muy suave, RPE 2 a 3/10',
      notes:
        'Semana de descarga: este acondicionamiento existe para recuperar, no para acumular fatiga extra.',
      objective: 'Mantener movilidad, core suave y recuperación activa sin añadir carga intensa.',
      howTo: ['Rango cómodo', 'Respira lento', 'Activa abdomen suave'],
      feelCues: ['Menos rigidez', 'Respiración amplia', 'Cuerpo ligero'],
      commonMistakes: ['Convertirlo en entrenamiento duro', 'Forzar rango', 'Saltar respiración'],
      stopIf: ['Dolor punzante', 'Fatiga aumenta', 'Mareo'],
      alternative: 'Camina 10 minutos y haz respiración nasal si estás muy cansado.',
      equipment: 'sin equipo'
    });
  }

  if (option === 0 || kind === 'homeCore') {
    return toExercise({
      name: 'Acondicionamiento de core para tensión corporal',
      description:
        'Alterna plancha frontal corta y hollow body ajustado, siempre dejando dos repeticiones en reserva. Busca una línea estable que puedas transferir a desplomes, taloneos y movimientos largos.',
      sets: 3,
      reps: '20 segundos de plancha + 15 segundos de hollow',
      rest: '60 segundos',
      intensity: 'Moderada, RPE 5/10',
      notes:
        'No persigas quemazón máxima. Si la espalda baja se arquea, reduce tiempo o apoya rodillas.',
      objective: 'Construir acondicionamiento físico de core específico para mantener tensión al escalar.',
      howTo: ['Costillas abajo', 'Respira corto', 'Termina antes de colapsar'],
      feelCues: ['Abdomen activo', 'Cadera estable', 'Respiración posible'],
      commonMistakes: ['Aguantar aire', 'Arquear lumbar', 'Alargar series con mala forma'],
      stopIf: ['Dolor lumbar', 'Calambre fuerte', 'Pérdida de técnica'],
      alternative: 'Haz dead bug lento con rodillas flexionadas.',
      equipment: 'sin equipo'
    });
  }

  if ((option === 1 || kind === 'homeStrength') && hasPullupBar && !fingerPainContext) {
    if (advanced && !hasLoadRestriction(profile)) {
      return toExercise({
        name: 'Tracción estricta submáxima en barra',
        description:
          'Haz dominadas estrictas o negativas controladas dejando siempre dos repeticiones en reserva. Usa tempo lento, escápulas activas y evita convertirlo en prueba máxima.',
        sets: 4,
        reps: '3 a 5 repeticiones estrictas',
        rest: '2 minutos',
        intensity: 'Submáxima, RPE 6 a 7/10',
        notes:
          'Para nivel avanzado no uses asistencia por defecto: ajusta dificultad con tempo, pausas o menos repeticiones, no con fallo muscular.',
        objective: 'Desarrollar tracción específica y estabilidad escapular útil para movimientos exigentes sin acumular fatiga peligrosa.',
        howTo: ['Escápulas activas', 'Sube sin impulso', 'Baja en 3 segundos'],
        feelCues: ['Espalda fuerte', 'Hombros estables', 'Dos repeticiones en reserva'],
        commonMistakes: ['Ir al fallo', 'Balancearse', 'Colgar pasivo abajo'],
        stopIf: ['Dolor de codo u hombro', 'Dolor de dedos', 'Pierdes control en la bajada'],
        alternative: 'Si estás muy fatigado, cambia por activación escapular y hollow body breve.',
        equipment: 'barra de dominadas'
      });
    }

    return toExercise({
      name: 'Acondicionamiento de tracción asistida',
      description:
        'Haz dominadas asistidas o negativas muy lentas con pies apoyados para controlar la carga. Mantén hombros activos y termina cada serie antes de llegar al fallo.',
      sets: 3,
      reps: '4 a 6 repeticiones controladas',
      rest: '90 segundos',
      intensity: 'Submáxima, RPE 5 a 6/10',
      notes:
        'Esto prepara espalda y escápulas para escalar sin convertir la sesión en fuerza máxima.',
      objective: 'Desarrollar tracción general y estabilidad escapular para tolerar mejor volumen de escalada.',
      howTo: ['Apoya pies', 'Sube controlado', 'Baja lento'],
      feelCues: ['Espalda activa', 'Hombros estables', 'Cero tirón en dedos'],
      commonMistakes: ['Ir al fallo', 'Colgar pasivo', 'Subir con cuello tenso'],
      stopIf: ['Dolor de codo u hombro', 'Dolor de dedos', 'No controlas la bajada'],
      alternative: 'Cambia por activación escapular de pie y plancha.',
      equipment: 'barra de dominadas'
    });
  }

  if (option === 2 || hasBands) {
    return toExercise({
      name: hasBands ? 'Acondicionamiento antagonista con banda' : 'Acondicionamiento antagonista sin equipo',
      description: hasBands
        ? 'Haz aperturas de dedos, rotación externa de hombro y jalón ligero con banda. Mantén tensión baja y controlada, sin dolor ni búsqueda de fallo.'
        : 'Haz aperturas activas de dedos, empujes contra pared y retracción escapular suave. Mantén respiración estable y control en todo el rango.',
      sets: 3,
      reps: '10 a 12 repeticiones por ejercicio',
      rest: '45 a 60 segundos',
      intensity: 'Suave a moderada, RPE 4/10',
      notes:
        'El objetivo es equilibrar tanto agarre y tracción de la escalada con trabajo de extensores y hombro.',
      objective: 'Acondicionar antagonistas, extensores de dedos y hombros para prevención de lesiones.',
      howTo: ['Tensión ligera', 'Muñeca neutra', 'Movimiento lento'],
      feelCues: ['Dorso de mano activo', 'Hombros despiertos', 'Sin irritación'],
      commonMistakes: ['Banda muy dura', 'Ir rápido', 'Apretar mandíbula'],
      stopIf: ['Dolor punzante', 'Dolor de dedos sube a 3/10', 'Hormigueo'],
      alternative: 'Haz solo aperturas suaves de dedos y movilidad de hombro.',
      equipment: hasBands ? 'bandas elásticas' : 'sin equipo'
    });
  }

  if (option === 3) {
    return toExercise({
      name: 'Acondicionamiento de piernas y cadera',
      description:
        'Combina sentadilla peso corporal con estocada y rotación de tronco. Muévete lento, cuida rodillas y busca cadera estable para mejorar empujes de pies en la pared.',
      sets: 3,
      reps: '8 sentadillas + 6 estocadas por lado',
      rest: '75 segundos',
      intensity: 'Moderada, RPE 5/10',
      notes:
        'Las piernas descargan antebrazos cuando sabes empujar con pies. Este bloque construye esa base física.',
      objective: 'Fortalecer piernas, cadera y control rotacional para usar mejor los pies.',
      howTo: ['Pies firmes', 'Rodilla alineada', 'Gira lento'],
      feelCues: ['Glúteos activos', 'Cadera estable', 'Respiración controlada'],
      commonMistakes: ['Rodillas caen adentro', 'Apurarse', 'Perder postura'],
      stopIf: ['Dolor de rodilla', 'Pinzamiento de cadera', 'Dolor lumbar'],
      alternative: 'Haz sentadilla a una silla y rotación torácica en el suelo.',
      equipment: 'sin equipo'
    });
  }

  return toExercise({
    name: 'Acondicionamiento aeróbico fácil',
    description:
      'Camina rápido, sube escaleras suave o haz circuito muy ligero de movilidad durante varios minutos. Debes poder hablar frases completas todo el tiempo.',
    sets: 1,
    reps: '12 a 18 minutos continuos',
    rest: 'Sin descanso',
    intensity: 'RPE 3 a 4/10',
    notes:
      'La base aeróbica ayuda a recuperarte entre pegues y tolerar sesiones más largas sin depender de intensidad alta.',
    objective: 'Construir resistencia general y capacidad de recuperación para escalar más consistente.',
    howTo: ['Ritmo cómodo', 'Respira nasal si puedes', 'No busques cansarte'],
    feelCues: ['Calor ligero', 'Puedes hablar', 'Energía estable'],
    commonMistakes: ['Ir demasiado fuerte', 'Saltarlo siempre', 'Terminar exhausto'],
    stopIf: ['Mareo', 'Dolor en pecho', 'Fatiga rara'],
    alternative: 'Haz 3 rondas suaves de movilidad si no puedes caminar.',
    equipment: 'sin equipo'
  });
}

function makeMainExercises(profile: UserProfile, weekNumber: number, sessionIndex: number, kind: SessionKind) {
  const hasRock = profile.equipment.includes('rock');
  const hasGym = profile.equipment.includes('gym');
  const hasPullupBar = profile.equipment.includes('pullup_bar');
  const hasBands = profile.equipment.includes('bands');
  const fingerPainContext =
    profile.injuries.includes('fingers') || profile.injuryDescription.toLowerCase().includes('dedo');
  const volumeCue = weekNumber % 4 === 2 ? 'Suma una serie si la técnica se mantiene limpia.' : 'Mantén margen y termina con energía.';
  const downloadCue = isDownloadWeek(weekNumber)
    ? 'Semana de descarga: corta el volumen si aparece fatiga o dolor.'
    : volumeCue;

  if (kind === 'rockTechnique' && hasRock) {
    return [
      toExercise({
        name: 'Escalada en roca con pies silenciosos',
        description:
          'Elige rutas dos grados por debajo de tu máximo y escala priorizando pies silenciosos, cadera cerca de la pared y respiración. Detente en cada apoyo importante para confirmar que el pie no se mueve.',
        sets: 4,
        reps: '1 ruta o tramo por serie',
        rest: '3 a 5 minutos',
        intensity: 'RPE 5 a 6/10',
        notes: `La meta no es encadenar al límite; es acumular metros de calidad con movimientos repetibles. ${downloadCue}`,
        objective: 'Mejorar eficiencia técnica y resistencia específica sin depender de muro indoor.',
        howTo: ['Escoge rutas cómodas', 'Mira pies antes de mover manos', 'Baja si la técnica se rompe'],
        feelCues: ['Respiración estable', 'Antebrazos cargan poco a poco', 'Pies precisos'],
        commonMistakes: ['Apretar de más', 'Subir intensidad muy pronto', 'Saltar descansos'],
        stopIf: ['Dolor de dedos aumenta', 'Técnica se desordena', 'Fatiga impide chapar seguro'],
        alternative: 'Si no puedes ir a roca, haz visualización de secuencias y movilidad en casa.',
        equipment: 'roca'
      }),
      toExercise({
        name: 'Lectura de ruta y descansos reales',
        description:
          'Antes de subir, identifica tres posiciones de descanso y dos secciones clave. En la ruta, practica relajar manos y respirar en cada descanso elegido.',
        sets: 3,
        reps: '1 lectura + 1 intento controlado',
        rest: '4 minutos',
        intensity: 'Técnica, RPE 4 a 5/10',
        notes:
          'Anota después qué descanso funcionó y cuál no. Esa bitácora vuelve el plan más específico.',
        objective: 'Convertir la escalada en roca en práctica deliberada, no solo volumen.',
        howTo: ['Observa desde el suelo', 'Marca descansos', 'Prueba una decisión por intento'],
        feelCues: ['Más calma', 'Mejor memoria de secuencia', 'Menos bombeo innecesario'],
        commonMistakes: ['Salir sin plan', 'Escalar siempre al límite', 'Ignorar pies buenos'],
        stopIf: ['Miedo altera decisiones', 'Fatiga alta', 'Condiciones inseguras'],
        alternative: 'Dibuja la ruta o describe la secuencia si no puedes escalar ese día.',
        equipment: 'roca'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  if (kind === 'rockVolume' && hasRock) {
    return [
      toExercise({
        name: 'Continuidad submáxima en roca',
        description:
          'Escala tramos fáciles durante varios minutos sin llegar al bombeo máximo. Baja o descansa cuando la respiración se acelere demasiado o los pies pierdan precisión.',
        sets: 4,
        reps: '4 a 6 minutos de escalada fácil',
        rest: '4 minutos',
        intensity: 'RPE 5/10',
        notes: 'Debe sentirse como resistencia controlada, no como un pegue límite. Prioriza ritmo y reposos.',
        objective: 'Construir base aeróbica específica para rutas largas.',
        howTo: ['Elige terreno fácil', 'Escala continuo', 'Descansa antes del fallo'],
        feelCues: ['Bombeo leve', 'Respiración manejable', 'Pies todavía precisos'],
        commonMistakes: ['Ir demasiado duro', 'No sacudir manos', 'Ignorar pies'],
        stopIf: ['Dolor de dedos sube', 'No puedes respirar estable', 'Técnica se desordena'],
        alternative: 'En casa, haz circuito suave de movilidad y core por bloques de 5 minutos.',
        equipment: 'roca'
      }),
      toExercise({
        name: 'Reposos y sacudidas en posiciones cómodas',
        description:
          'Busca posiciones de descanso en roca fácil. Alterna sacudir una mano, respirar largo y recolocar pies antes de seguir.',
        sets: 5,
        reps: '20 a 30 segundos por reposo',
        rest: '1 minuto',
        intensity: 'Técnica, RPE 4/10',
        notes: 'Entrena ahorrar energía. Si no encuentras reposo, baja el grado de la ruta.',
        objective: 'Mejorar recuperación durante la escalada y reducir tensión innecesaria.',
        howTo: ['Encuentra pie bueno', 'Sacude una mano', 'Exhala antes de moverte'],
        feelCues: ['Antebrazo descarga', 'Hombros bajan', 'Más calma'],
        commonMistakes: ['Colgar tenso', 'Moverse sin respirar', 'Elegir terreno duro'],
        stopIf: ['Miedo alto', 'Fatiga excesiva', 'Dolor punzante'],
        alternative: 'Practica respiración y sacudidas de manos de pie en casa.',
        equipment: 'roca'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  if (kind === 'rockProject' && hasRock) {
    return [
      toExercise({
        name: 'Simulación de crux en roca',
        description:
          'Elige una sección corta y difícil pero segura. Trabaja dos o tres movimientos con descansos completos, buscando beta limpia en lugar de volumen alto.',
        sets: 4,
        reps: '2 a 3 movimientos clave',
        rest: '4 a 6 minutos',
        intensity: fingerPainContext ? 'RPE 5/10 submáximo' : 'RPE 7/10 controlado',
        notes:
          'No conviertas la sesión en pegues infinitos. Si la calidad baja, cambia a técnica fácil.',
        objective: 'Practicar movimientos de proyecto sin acumular fatiga peligrosa.',
        howTo: ['Aísla el crux', 'Descansa completo', 'Registra la beta'],
        feelCues: ['Esfuerzo claro', 'Movimientos precisos', 'Recuperación completa'],
        commonMistakes: ['Repetir cansado', 'Cambiar beta cada pegue', 'Ignorar dolor'],
        stopIf: ['Dolor de dedos a 3/10', 'Caídas descontroladas', 'Pérdida de técnica'],
        alternative: 'Haz visualización detallada de la secuencia y movilidad de cadera.',
        equipment: 'roca'
      }),
      toExercise({
        name: 'Pegues cortos con intención única',
        description:
          'En cada intento elige una sola intención: pies, respiración o ritmo. Termina el pegue aunque no encadenes y anota qué cambió.',
        sets: 3,
        reps: '1 intento corto',
        rest: '5 minutos',
        intensity: 'RPE 6 a 7/10',
        notes: 'La sesión busca aprendizaje, no agotamiento. Mantén descansos largos y atención al cuerpo.',
        objective: 'Convertir intentos de proyecto en información útil para la siguiente semana.',
        howTo: ['Elige una intención', 'Haz un intento', 'Anota una mejora'],
        feelCues: ['Foco mental', 'Mejor ritmo', 'Fatiga controlada'],
        commonMistakes: ['Querer corregir todo', 'Descansar poco', 'Entrar frustrado'],
        stopIf: ['Tensión emocional alta', 'Dolor punzante', 'Fatiga cambia la caída'],
        alternative: 'Ensaya la secuencia en el suelo con gestos y respiración.',
        equipment: 'roca'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  if (kind === 'rockRecovery' && hasRock) {
    return [
      toExercise({
        name: 'Roca fácil de calidad',
        description:
          'Escala rutas muy cómodas con la regla de poder hablar mientras subes. Enfócate en fluidez, pies y respiración sin buscar fatiga.',
        sets: 3,
        reps: '1 ruta fácil',
        rest: '3 minutos',
        intensity: 'RPE 3 a 4/10',
        notes: 'Esta semana consolida adaptaciones. Si algo se siente pesado, reduce a movilidad.',
        objective: 'Descargar sin perder contacto técnico con la roca.',
        howTo: ['Elige muy fácil', 'Respira estable', 'Termina fresco'],
        feelCues: ['Ligereza', 'Confianza', 'Cero bombeo fuerte'],
        commonMistakes: ['Subir intensidad', 'Competir con otros', 'Forzar volumen'],
        stopIf: ['Dolor aumenta', 'Fatiga acumulada', 'Motivación baja por cansancio'],
        alternative: 'Camina suave y haz movilidad de cadera y hombro en casa.',
        equipment: 'roca'
      }),
      toExercise({
        name: 'Revisión de bitácora y beta',
        description:
          'Después de escalar fácil, escribe tres aprendizajes: movimiento que mejoró, molestia a vigilar y decisión para la próxima semana.',
        sets: 1,
        reps: '5 minutos',
        rest: 'Sin descanso',
        intensity: 'Mental y suave',
        notes: 'La recuperación también es ordenar información para entrenar mejor.',
        objective: 'Usar la semana de descarga para ajustar el siguiente bloque.',
        howTo: ['Escribe tres puntos', 'Marca molestias', 'Define un ajuste'],
        feelCues: ['Claridad', 'Menos ansiedad', 'Plan más concreto'],
        commonMistakes: ['No registrar nada', 'Solo anotar grados', 'Ignorar dolor'],
        stopIf: ['No aplica físicamente', 'Si hay dolor fuerte, prioriza consulta'],
        alternative: 'Graba una nota de voz breve si no quieres escribir.',
        equipment: 'sin equipo'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  if ((kind === 'gymTechnique' || kind === 'gymVolume' || kind === 'gymProject' || kind === 'gymRecovery') && hasGym) {
    const recovery = kind === 'gymRecovery';
    const project = kind === 'gymProject';
    const volume = kind === 'gymVolume';

    return [
      toExercise({
        name: recovery
          ? 'Muro fácil con técnica limpia'
          : volume
            ? 'Circuitos de resistencia en muro'
            : project
              ? 'Boulders de coordinación controlada'
              : 'Técnica de pies en muro',
        description: recovery
          ? 'Escala bloques o rutas muy fáciles y baja antes de sentir bombeo. Cada subida debe sentirse más fluida que intensa.'
          : volume
            ? 'Elige rutas o travesías fáciles y mantén movimiento continuo por bloques cortos. Descansa antes de llegar al fallo para conservar técnica.'
            : project
              ? 'Elige dos boulders retadores pero seguros y trabaja movimientos aislados con descanso completo. No busques volumen alto.'
              : 'Escala bloques fáciles usando solo la intención de pisar silencioso y mover cadera antes de tirar con brazos.',
        sets: recovery ? 3 : 4,
        reps: volume ? '3 a 5 minutos' : project ? '2 a 4 movimientos' : '1 bloque o ruta',
        rest: project ? '4 minutos' : '2 a 3 minutos',
        intensity: recovery ? 'RPE 3 a 4/10' : project ? 'RPE 6 a 7/10' : 'RPE 5/10',
        notes: recovery
          ? 'Descarga activa: si aparece fatiga, termina la escalada y pasa a movilidad.'
          : 'No uses agarres dolorosos ni arqueo máximo. Cambia de problema si la técnica se rompe.',
        objective: recovery
          ? 'Mantener contacto con el muro sin acumular fatiga.'
          : volume
            ? 'Mejorar resistencia específica con margen.'
            : project
              ? 'Practicar movimientos difíciles sin exceso de intentos.'
              : 'Mejorar eficiencia técnica y precisión.',
        howTo: ['Elige intensidad correcta', 'Define una intención', 'Descansa antes del fallo'],
        feelCues: ['Control', 'Respiración posible', 'Pies presentes'],
        commonMistakes: ['Ir al límite', 'Descansar poco', 'Tirar solo con brazos'],
        stopIf: ['Dolor de dedos sube', 'Hombro molesta', 'Técnica se rompe'],
        alternative: 'Cambia por movilidad y core en casa si no puedes ir al muro.',
        equipment: 'gym de escalada'
      }),
      toExercise({
        name: project ? 'Análisis de beta entre intentos' : 'Reposos activos y respiración',
        description: project
          ? 'Entre intentos, describe la beta en una frase: pie, mano, cadera y respiración. Vuelve a intentar solo si la idea es clara.'
          : 'En terreno fácil, practica sacudir una mano y exhalar largo antes del siguiente movimiento. Mantén hombros bajos.',
        sets: 3,
        reps: project ? '1 nota por intento' : '30 segundos por reposo',
        rest: '1 a 2 minutos',
        intensity: 'Técnica',
        notes: 'La meta es aprender a gastar menos energía, no añadir cansancio.',
        objective: 'Mejorar toma de decisiones y recuperación durante la escalada.',
        howTo: ['Pausa', 'Respira', 'Decide el siguiente movimiento'],
        feelCues: ['Más calma', 'Antebrazo baja', 'Mejor precisión'],
        commonMistakes: ['Apurarse', 'No mirar pies', 'Repetir sin intención'],
        stopIf: ['Fatiga alta', 'Dolor punzante', 'Frustración cambia la técnica'],
        alternative: 'Haz visualización de ruta desde el piso.',
        equipment: 'gym de escalada'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  if (kind === 'homeCore') {
    return [
      toExercise({
        name: 'Plancha frontal con respiración',
        description:
          'Apoya antebrazos, aprieta abdomen y glúteos, y mantén una línea larga de cabeza a talones. Respira sin dejar que la cadera se hunda.',
        sets: 3,
        reps: weekNumber % 4 === 2 ? '30 a 40 segundos' : '20 a 30 segundos',
        rest: '60 segundos',
        intensity: 'Moderada, RPE 5/10',
        notes: 'Termina cada serie antes de perder la línea. Calidad sobre duración.',
        objective: 'Mejorar tensión corporal para transferir fuerza entre pies y manos.',
        howTo: ['Codos bajo hombros', 'Costillas abajo', 'Respira lento'],
        feelCues: ['Abdomen activo', 'Glúteos firmes', 'Cuello relajado'],
        commonMistakes: ['Cadera hundida', 'Aguantar aire', 'Mirar al frente'],
        stopIf: ['Dolor lumbar', 'Temblores descontrolados', 'No puedes respirar'],
        alternative: 'Haz plancha con rodillas apoyadas.',
        equipment: 'sin equipo'
      }),
      toExercise({
        name: 'Hollow body hold ajustado',
        description:
          'Acuéstate boca arriba, pega costillas hacia abajo y eleva piernas solo hasta donde la espalda baja no se arquee. Mantén brazos al frente si necesitas hacerlo más fácil.',
        sets: 3,
        reps: '15 a 25 segundos',
        rest: '60 segundos',
        intensity: 'Moderada',
        notes: 'La espalda baja manda el rango. Si se despega, dobla rodillas.',
        objective: 'Construir control de core para desplomes, tensión y taloneos.',
        howTo: ['Exhala', 'Costillas abajo', 'Eleva piernas poco'],
        feelCues: ['Abdomen profundo', 'Espalda estable', 'Respiración corta pero posible'],
        commonMistakes: ['Arquear lumbar', 'Subir demasiado piernas', 'Tensar cuello'],
        stopIf: ['Dolor lumbar', 'Calambre fuerte', 'Pérdida de control'],
        alternative: 'Haz dead bug lento con rodillas flexionadas.',
        equipment: 'sin equipo'
      }),
      toExercise({
        name: 'Estocada con rotación controlada',
        description:
          'Da un paso largo, baja suave y gira el tronco hacia la pierna del frente sin colapsar rodilla. Regresa lento y alterna lados.',
        sets: 2,
        reps: '6 por lado',
        rest: '45 segundos',
        intensity: 'Suave a moderada',
        notes: 'Busca movilidad útil para cadera y estabilidad de pies, no cansarte.',
        objective: 'Mejorar movilidad de cadera y control de rotación para escalada.',
        howTo: ['Paso largo', 'Rodilla estable', 'Gira lento'],
        feelCues: ['Cadera abre', 'Equilibrio activo', 'Tronco estable'],
        commonMistakes: ['Rodilla cae adentro', 'Girar rápido', 'Perder equilibrio'],
        stopIf: ['Dolor de rodilla', 'Pinzamiento de cadera', 'Mareo'],
        alternative: 'Haz rotación torácica en el suelo.',
        equipment: 'sin equipo'
      })
    ];
  }

  if (kind === 'homeMovement' || kind === 'homeRecovery') {
    const recovery = kind === 'homeRecovery';

    return [
      toExercise({
        name: recovery ? 'Movilidad de hombro y columna torácica' : 'Técnica de pies sin muro',
        description: recovery
          ? 'Haz rotaciones torácicas, círculos de hombro y estiramiento suave de pecho. Mantén todo en rango cómodo y sin buscar intensidad.'
          : 'Marca una línea en el piso o usa una línea imaginaria. Pisa lento con precisión, cambia peso de una pierna a otra y mantén cadera estable.',
        sets: recovery ? 2 : 4,
        reps: recovery ? '45 segundos por movimiento' : '2 minutos',
        rest: '30 a 45 segundos',
        intensity: recovery ? 'Muy suave' : 'Técnica, RPE 3/10',
        notes: recovery
          ? 'La descarga debe dejarte mejor que al inicio. Si te cansas, reduce volumen.'
          : 'Este bloque parece simple, pero construye atención de pies para escalar mejor cuando vuelvas a roca o muro.',
        objective: recovery
          ? 'Recuperar movilidad y bajar tensión acumulada.'
          : 'Mejorar precisión de pies y transferencia de peso sin necesitar muro.',
        howTo: recovery
          ? ['Rango cómodo', 'Respira lento', 'Cero rebotes']
          : ['Mira el pie', 'Pisa suave', 'Traslada peso'],
        feelCues: recovery
          ? ['Menos rigidez', 'Respiración amplia', 'Hombros sueltos']
          : ['Equilibrio', 'Pies silenciosos', 'Cadera estable'],
        commonMistakes: recovery
          ? ['Forzar estiramiento', 'Ir rápido', 'Ignorar dolor']
          : ['Apurarse', 'Pisar fuerte', 'Mirar al frente todo el tiempo'],
        stopIf: ['Dolor punzante', 'Mareo', 'Hormigueo'],
        alternative: 'Camina suave 10 minutos y respira nasal.',
        equipment: 'sin equipo'
      }),
      toExercise({
        name: recovery ? 'Extensores y antebrazo suave' : 'Visualización de secuencia',
        description: recovery
          ? 'Abre y cierra dedos suavemente, masajea antebrazos y mueve muñecas en círculos. Todo debe sentirse como descarga.'
          : 'Elige una ruta o movimiento que conozcas e imagina pies, manos, respiración y descanso. Repite la secuencia mentalmente con calma.',
        sets: 2,
        reps: recovery ? '12 repeticiones suaves' : '3 rondas de 60 segundos',
        rest: '30 segundos',
        intensity: 'Muy suave',
        notes: recovery
          ? 'No busques fatigar extensores. Solo baja tensión.'
          : 'La visualización funciona mejor cuando es concreta: pie derecho, mano izquierda, exhala, mueve cadera.',
        objective: recovery
          ? 'Promover recuperación de manos y antebrazos.'
          : 'Entrenar lectura y memoria motriz sin carga física.',
        howTo: recovery
          ? ['Muñeca neutra', 'Abre lento', 'Masaje suave']
          : ['Cierra ojos', 'Nombra pies y manos', 'Respira en descansos'],
        feelCues: recovery
          ? ['Manos ligeras', 'Antebrazo descarga', 'Cero dolor']
          : ['Secuencia clara', 'Menos ansiedad', 'Foco técnico'],
        commonMistakes: recovery
          ? ['Apretar fuerte', 'Usar dolor como guía', 'Ir al fallo']
          : ['Imaginar genérico', 'Saltarse pies', 'Convertirlo en preocupación'],
        stopIf: ['Dolor sube', 'Tensión aumenta', 'Hormigueo'],
        alternative: 'Escribe la secuencia en la bitácora.',
        equipment: hasBands && recovery ? 'bandas elásticas opcionales' : 'sin equipo'
      }),
      makeConditioningExercise(profile, weekNumber, sessionIndex, kind)
    ];
  }

  return [
    toExercise({
      name:
        hasPullupBar && isAdvancedProfile(profile) && !fingerPainContext && !hasLoadRestriction(profile)
          ? 'Tracción estricta submáxima en barra'
          : hasPullupBar
            ? 'Suspensión asistida en barra'
            : 'Remo escapular sin equipo',
      description:
        hasPullupBar && isAdvancedProfile(profile) && !fingerPainContext && !hasLoadRestriction(profile)
          ? 'Haz repeticiones estrictas o sostén la parte alta de la dominada con escápulas activas. Mantén margen, baja lento y corta antes de perder control.'
          : hasPullupBar
            ? 'Sujeta una barra con pies apoyados en el suelo o una silla para descargar peso. Mantén hombros activos y sostén sin llegar al fallo.'
        : 'Inclínate ligeramente, activa escápulas hacia atrás y abajo, y simula una tracción lenta manteniendo abdomen firme.',
      sets: 3,
      reps:
        hasPullupBar && isAdvancedProfile(profile) && !fingerPainContext && !hasLoadRestriction(profile)
          ? '3 a 5 repeticiones o 8 segundos de sostén'
          : hasPullupBar && !fingerPainContext
            ? '8 a 12 segundos'
            : '10 repeticiones lentas',
      rest: '90 segundos',
      intensity:
        hasPullupBar && isAdvancedProfile(profile) && !fingerPainContext && !hasLoadRestriction(profile)
          ? 'Submáxima, RPE 6 a 7/10'
          : fingerPainContext
            ? 'Submáxima, RPE 4/10'
            : 'Moderada, RPE 5 a 6/10',
      notes:
        isAdvancedProfile(profile) && !hasLoadRestriction(profile)
          ? 'El estímulo debe parecer entrenamiento profesional: tensión limpia, margen y progresión, no una regresión genérica.'
          : 'Evita agarre arqueado máximo y cualquier intento al fallo. Debe sentirse controlado y repetible.',
      objective: 'Construir base de tracción y estabilidad sin cargas máximas de dedos.',
      howTo:
        hasPullupBar && isAdvancedProfile(profile) && !fingerPainContext && !hasLoadRestriction(profile)
          ? ['Activa escápulas', 'Sube estricto', 'Baja lento']
          : ['Apoya pies', 'Activa escápulas', 'Suelta antes de perder forma'],
      feelCues: ['Espalda activa', 'Hombros firmes', 'Dedos sin dolor agudo'],
      commonMistakes: ['Colgar pasivo', 'Apretar al máximo', 'Contener la respiración'],
      stopIf: ['Dolor de dedos sube a 3/10', 'Dolor punzante', 'Hombro se siente inestable'],
      alternative: 'Cambia por activación escapular y extensores con banda.',
      equipment: hasPullupBar ? 'barra de dominadas' : 'sin equipo'
    }),
    toExercise({
      name: hasBands ? 'Extensores de dedos con banda' : 'Plancha frontal técnica',
      description: hasBands
        ? 'Usa una banda suave y abre los dedos manteniendo muñeca neutra. Pausa un segundo abierto y regresa lento para trabajar control.'
        : 'Apoya antebrazos, aprieta abdomen y glúteos, y mantén una línea larga de cabeza a talones sin hundir la cadera.',
      sets: 3,
      reps: hasBands ? '12 repeticiones' : '20 a 30 segundos',
      rest: '60 segundos',
      intensity: 'Suave a moderada',
      notes:
        'Termina con sensación de activación, no fatiga profunda. Este bloque debe ayudar a recuperar, no irritar.',
      objective: hasBands
        ? 'Dar trabajo antagonista a dedos y antebrazo para tolerar mejor la carga de escalada.'
        : 'Mejorar tensión corporal para que pies y cadera trabajen mejor en roca.',
      howTo: hasBands
        ? ['Banda ligera', 'Abre dedos lento', 'Pausa un segundo']
        : ['Codos bajo hombros', 'Costillas abajo', 'Respira sin perder línea'],
      feelCues: hasBands
        ? ['Dorso de mano activo', 'Cero dolor', 'Antebrazo ligero']
        : ['Abdomen activo', 'Glúteos firmes', 'Respiración posible'],
      commonMistakes: hasBands
        ? ['Banda muy pesada', 'Doblar muñeca', 'Ir rápido']
        : ['Cadera hundida', 'Cuello tenso', 'Aguantar aire'],
      stopIf: ['Dolor punzante', 'Técnica se rompe', 'Fatiga cambia el movimiento'],
      alternative: 'Reduce repeticiones o cambia por respiración diafragmática.',
      equipment: hasBands ? 'bandas elásticas' : 'sin equipo'
    }),
    toExercise({
      name: 'Sentadilla peso corporal con pausa',
      description:
        'Baja a una sentadilla cómoda, pausa un segundo y sube empujando el piso. Mantén pies activos y tronco largo como si prepararas una posición de escalada.',
      sets: 3,
      reps: '8 a 10 repeticiones',
      rest: '60 segundos',
      intensity: 'Moderada',
      notes: 'La fuerza de piernas también ayuda a usar mejor los pies y descargar antebrazos.',
      objective: 'Construir base de piernas y control de cadera para posiciones de escalada.',
      howTo: ['Pies firmes', 'Baja controlado', 'Pausa y sube'],
      feelCues: ['Piernas activas', 'Cadera estable', 'Respiración posible'],
      commonMistakes: ['Rodillas colapsan', 'Apurarse', 'Levantar talones'],
      stopIf: ['Dolor de rodilla', 'Dolor lumbar', 'Mareo'],
      alternative: 'Haz sentadilla a una silla.',
      equipment: 'sin equipo'
    })
  ];
}

function makeCooldownExercises(kind: SessionKind, weekNumber: number) {
  const isClimbingDay = kind.startsWith('rock') || kind.startsWith('gym');

  return [
    toExercise({
      name: 'Respiración y vuelta a la calma',
      description:
        'Acuéstate o siéntate cómodo y respira lento por la nariz. Al exhalar, relaja manos, antebrazos, hombros y mandíbula durante varios ciclos.',
      reps: '3 a 5 minutos',
      rest: 'Sin descanso',
      intensity: 'Muy suave',
      notes:
        'Debe bajar pulsaciones y tensión. Si la mente se acelera, cuenta exhalaciones largas.',
      objective: 'Bajar activación del sistema nervioso y favorecer recuperación.',
      howTo: ['Inhala por nariz', 'Exhala más largo', 'Relaja manos y hombros'],
      feelCues: ['Pulso baja', 'Manos menos tensas', 'Respiración amplia'],
      commonMistakes: ['Apurarlo', 'Mirar el celular', 'Forzar aire'],
      stopIf: ['Mareo', 'Ansiedad aumenta', 'Dolor raro'],
      alternative: 'Camina suave 5 minutos.',
      equipment: 'sin equipo'
    }),
    toExercise({
      name: isClimbingDay ? 'Descarga suave de antebrazo y hombro' : 'Movilidad suave de cadera y espalda',
      description: isClimbingDay
        ? 'Haz estiramientos suaves de flexores de muñeca, extensores y pecho. Mantén cada posición cómoda, sin buscar máximo rango ni dolor.'
        : 'Haz postura de niño, rotaciones torácicas y respiración lateral de costillas. Mantén cada posición cómoda y sin dolor.',
      reps: '30 segundos por posición',
      rest: '15 segundos',
      intensity: 'Suave',
      notes: isDownloadWeek(weekNumber)
        ? 'En descarga, termina con sensación de frescura. No agregues trabajo extra aunque te sientas bien.'
        : 'La sensación debe ser de descarga. Si aparece dolor, reduce rango inmediatamente.',
      objective: isClimbingDay
        ? 'Cerrar la sesión con movilidad ligera de brazos y hombros.'
        : 'Cerrar la sesión bajando tensión de cadera, espalda y respiración.',
      howTo: isClimbingDay ? ['Muñeca neutra', 'Estira suave', 'Respira lento'] : ['Rango cómodo', 'Exhala largo', 'Cero rebotes'],
      feelCues: ['Tensión baja', 'Rango cómodo', 'Sin dolor articular'],
      commonMistakes: ['Forzar dedos', 'Rebotar', 'Buscar dolor'],
      stopIf: ['Dolor de dedos sube', 'Hormigueo', 'Dolor punzante'],
      alternative: 'Masaje suave de antebrazo con la otra mano.',
      equipment: 'sin equipo'
    })
  ];
}

function buildFallbackPlan(
  profile: UserProfile,
  libraryTraceability?: LibraryTraceability,
  skeleton?: PlanSkeleton
): TrainingPlan {
  const now = new Date().toISOString();
  const sessionCount = Math.max(1, Math.min(profile.daysPerWeek || 3, 5));
  const totalWeeks = Math.max(1, profile.planDuration || 4);

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    planVersion: skeleton?.planVersion ?? 'planner-v1-fallback',
    objective:
      profile.goalDescription ||
      profile.projectDescription ||
      profile.project ||
      'Construir una base segura de técnica, resistencia y fuerza general para escalar mejor.',
    mesocycleType: skeleton?.mesocycleType ?? `${totalWeeks} semanas de progresión técnica, física y recuperación`,
    microcycles: skeleton?.microcycles ?? null,
    planningRationale: skeleton?.planningRationale ?? null,
    mainObjective:
      profile.goalDescription ||
      profile.projectDescription ||
      'Convertir el perfil del usuario en un bloque de entrenamiento progresivo y seguro.',
    secondaryObjectives: [
      'Mejorar calidad técnica sin repetir sesiones genéricas',
      'Incluir acondicionamiento físico específico para escalada',
      'Mantener carga submáxima con criterios claros de seguridad'
    ],
    athleteSummary: getProfileContextSummary(profile) || `Perfil con nivel ${getProfileLevelLabel(profile)}.`,
    riskSummary: hasLoadRestriction(profile)
      ? 'Hay señales de lesión, fatiga o recuperación limitada: se prioriza carga conservadora y margen.'
      : 'Sin restricción fuerte declarada: se usa progresión submáxima con control técnico.',
    equipmentSummary: profile.equipment.length
      ? `Equipo disponible: ${profile.equipment.join(', ')}. No se prescribe equipo fuera de esta lista.`
      : 'Sin equipo claro declarado: se usan alternativas de casa y técnica sin material.',
    progressionModel:
      skeleton?.progressionModel ??
      'Base técnica → volumen controlado → especificidad moderada → descarga y consolidación.',
    weeklyFeedbackPrompt:
      'Al terminar cada semana registra RPE, dolor de dedos, energía, sueño y qué ejercicio se sintió demasiado fácil o demasiado agresivo.',
    recoveryGuidelines: [
      'Duerme y come suficiente antes de aumentar intensidad; si el sueño cae, reduce volumen 20%.',
      'Si aparece dolor punzante o dolor que sube a 3/10, detén la parte intensa y cambia a movilidad suave.'
    ],
    safetyRules: [
      'No entrenes al fallo muscular; deja margen técnico en ejercicios de tracción, dedos y core.',
      'Respeta descansos completos y baja intensidad si la técnica, respiración o control corporal se deterioran.'
    ],
    totalWeeks,
    currentWeek: 1,
    startDate: now,
    status: 'active',
    createdAt: now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? false,
    librarySources: libraryTraceability?.sourceNames ?? [],
    qualityScores: null,
    weeks: Array.from({ length: totalWeeks }, (_, weekIndex) => {
      const weekNumber = weekIndex + 1;
      const blueprint = getWeekBlueprint(weekNumber);
      const skeletonWeek = skeleton?.weeks[weekIndex];

      return {
        weekNumber,
        microcycleId: skeletonWeek?.microcycleId ?? null,
        theme: `Semana ${weekNumber}: ${blueprint.theme}`,
        objective: skeletonWeek?.objective ?? blueprint.theme,
        focusAreas: blueprint.focusAreas,
        microcycle:
          skeletonWeek?.objective ??
          weekNumber <= 2
            ? 'Microciclo 1-2: base específica y control'
            : 'Microciclo 3-4: especificidad, intensidad controlada y consolidación',
        progression:
          skeletonWeek?.progressionFocus ??
          weekNumber === 1
            ? 'Semana de entrada: volumen técnico y medición de tolerancia.'
            : isDownloadWeek(weekNumber)
              ? 'Semana de descarga: bajar volumen y consolidar aprendizajes.'
              : 'Progresar una variable principal sin sacrificar técnica ni seguridad.',
        progressionFocus: skeletonWeek?.progressionFocus ?? null,
        loadLevel: skeletonWeek?.loadLevel ?? (isDownloadWeek(weekNumber) ? 'descarga' : 'base'),
        deloadWeek: skeletonWeek?.deloadWeek ?? isDownloadWeek(weekNumber),
        deloadFocus: isDownloadWeek(weekNumber)
          ? 'Reducir volumen y salir con sensación de frescura.'
          : null,
        sessions: Array.from({ length: sessionCount }, (_, sessionIndex) => {
          const rawDay = profile.availableDays[sessionIndex];
          const dayLabel = rawDay
            ? DAY_LABELS[rawDay] ?? rawDay
            : DAYS_BY_COUNT[sessionIndex] ?? `Día ${sessionIndex + 1}`;
          const kind = getSessionKind(profile, weekNumber, sessionIndex);
          const location = getSessionLocation(kind);
          const skeletonSession = skeletonWeek?.sessions[sessionIndex];
          const warmup = makeWarmupExercises(profile, kind, weekNumber);
          const mainBlock = makeMainExercises(profile, weekNumber, sessionIndex, kind);
          const cooldown = makeCooldownExercises(kind, weekNumber);
          const finalBlock = [
            toExercise({
              name: 'Registro técnico y ajuste de carga',
              description:
                'Cierra la parte de entrenamiento anotando qué ejercicio fue más útil, qué molestia apareció y qué variable ajustarías la próxima vez. Usa esa información para no repetir carga a ciegas.',
              reps: '3 notas breves',
              rest: 'Sin descanso',
              intensity: 'Reflexivo y suave',
              notes:
                'Este feedback semanal hace que el plan deje de ser una lista fija y se vuelva entrenamiento adaptable.',
              objective: 'Convertir la sesión en información útil para ajustar el siguiente microciclo.',
              howTo: ['Anota RPE', 'Anota dolor 0-10', 'Elige un ajuste'],
              feelCues: ['Claridad', 'Menos incertidumbre', 'Mejor decisión para la próxima sesión'],
              commonMistakes: ['No registrar nada', 'Solo anotar si encadenaste', 'Ignorar dolor leve'],
              stopIf: ['Si hay dolor fuerte, prioriza recuperación y consulta profesional'],
              alternative: 'Graba una nota de voz de 30 segundos.',
              equipment: 'sin equipo',
              riskLevel: 'bajo'
            })
          ];

          return {
            dayNumber: sessionIndex + 1,
            title: getSessionTitle(kind, dayLabel, weekNumber),
            stimulusType: skeletonSession?.stimulusType ?? kind,
            location: skeletonSession?.location ?? location,
            equipment:
              skeletonSession?.exerciseCandidates
                .flatMap((exercise) => exercise.requiredEquipment)
                .filter(Boolean) ?? null,
            estimatedMinutes: Math.min(Math.max(profile.sessionDuration || 75, 45), 120),
            estimatedDurationMinutes:
              skeletonSession?.estimatedDurationMinutes ?? Math.min(Math.max(profile.sessionDuration || 75, 45), 120),
            objective: skeletonSession?.objective ?? `${blueprint.focusAreas[0]} aplicado a ${getProfileLevelLabel(profile)}.`,
            why:
              skeletonSession?.why ??
              `Esta sesión existe para avanzar el microciclo de ${blueprint.theme} sin usar equipo no declarado ni repetir una plantilla genérica.`,
            intensityTarget: skeletonSession?.intensityTarget ?? (isDownloadWeek(weekNumber)
              ? 'RPE 3 a 4/10, descarga técnica'
              : 'RPE 5 a 7/10 con 2 repeticiones o movimientos en reserva'),
            warmup,
            warmupGeneral: warmup.slice(0, 2),
            warmupSpecific: warmup.slice(-2),
            mainBlock,
            finalBlock,
            cooldown,
            safetyNotes: [
              'Baja intensidad si el dolor sube a 3/10 o cambia tu técnica.',
              'No busques fallo muscular ni agarres máximos; conserva margen.'
            ],
            adjustmentRules: [
              'Si la sesión se siente fácil, aumenta solo una variable la próxima semana.',
              'Si hay fatiga o sueño malo, reduce una serie por bloque y alarga descansos.'
            ],
            successCriteria: [
              'Terminas con técnica limpia y respiración controlada.',
              'Puedes registrar RPE, dolor y un ajuste concreto para la siguiente sesión.'
            ],
            nutritionTip:
              isDownloadWeek(weekNumber)
                ? 'Prioriza comida normal, agua y sueño; la descarga funciona cuando realmente bajas la carga.'
                : 'Come algo ligero con carbohidratos 60 a 90 minutos antes y toma agua durante la sesión.',
            source:
              `Plan de respaldo BilClimb para ${getProfileContextSummary(profile) || getProfileLevelLabel(profile)}: ${blueprint.theme}, progresión submáxima, acondicionamiento y prevención de lesiones.`,
            completed: false,
            checkIn: null
          };
        })
      };
    })
  };
}

function shouldUseFastPlanBuilder(profile: UserProfile) {
  const totalSessions = (profile.planDuration || 4) * (profile.daysPerWeek || 3);
  const sessionLimit = hasDetailedOnboardingContext(profile)
    ? PERSONALIZED_STRUCTURED_SESSION_LIMIT
    : MAX_STRUCTURED_SESSIONS;

  return totalSessions > sessionLimit;
}

function mergeLibraryTraceability(
  ...items: Array<LibraryTraceability | undefined>
): LibraryTraceability {
  const sourceNames = items.flatMap((item) => item?.sourceNames ?? []);

  return {
    usedFileSearch: items.some((item) => item?.usedFileSearch),
    sourceNames: Array.from(new Set(sourceNames))
  };
}

function limitText(value: string, maxLength = 180) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function compactCandidate(exercise: SkeletonExerciseCandidate) {
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    equipment: exercise.requiredEquipment,
    risk: exercise.riskLevel,
    objective: limitText(exercise.objective, 140),
    dose: exercise.defaultDose,
    rest: exercise.defaultRest,
    howTo: exercise.howTo.slice(0, 2),
    stopIf: exercise.stopIf.slice(0, 2),
    regressions: exercise.regressions.slice(0, 2),
    sourceConcept: limitText(exercise.sourceConcept, 140)
  };
}

function compactWeekSkeleton(week: WeekSkeleton) {
  return {
    weekNumber: week.weekNumber,
    microcycleId: week.microcycleId,
    objective: week.objective,
    progressionFocus: week.progressionFocus,
    loadLevel: week.loadLevel,
    deloadWeek: week.deloadWeek,
    sessions: week.sessions.map((session) => ({
      dayNumber: session.dayNumber,
      dayLabel: session.dayLabel,
      title: session.title,
      stimulusType: session.stimulusType,
      objective: session.objective,
      why: session.why,
      location: session.location,
      estimatedDurationMinutes: session.estimatedDurationMinutes,
      intensityTarget: session.intensityTarget,
      requiredBlocks: session.requiredBlocks,
      candidateExerciseIds: session.candidateExerciseIds,
      exerciseCandidates: session.exerciseCandidates.map(compactCandidate),
      restrictions: session.restrictions,
      successCriteria: session.successCriteria,
      adjustmentRules: session.adjustmentRules,
      safetyNotes: session.safetyNotes
    }))
  };
}

function buildPlanShell({
  profile,
  analysis,
  selectedTemplate,
  skeleton,
  libraryTraceability,
  weeks
}: {
  profile: UserProfile;
  analysis: ProfileAnalysis;
  selectedTemplate: PlanTemplate;
  skeleton: PlanSkeleton;
  libraryTraceability?: LibraryTraceability;
  weeks: TrainingPlan['weeks'];
}): TrainingPlan {
  const now = new Date().toISOString();
  const explicitObjective =
    profile.goalDescription || profile.projectDescription || profile.project || selectedTemplate.name;

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    planVersion: skeleton.planVersion,
    objective: explicitObjective,
    mesocycleType: skeleton.mesocycleType,
    microcycles: skeleton.microcycles,
    planningRationale: skeleton.planningRationale,
    mainObjective: `Desarrollar ${analysis.mainGoal} con una progresión segura de ${weeks.length} semanas adaptada al perfil y equipo disponible.`,
    secondaryObjectives: [
      analysis.secondaryGoal ? `Apoyar objetivo secundario: ${analysis.secondaryGoal}.` : 'Mejorar técnica y control corporal.',
      'Incluir acondicionamiento físico específico sin usar equipo no disponible.',
      'Ajustar carga según dolor, energía, sueño y feedback semanal.'
    ],
    athleteSummary: getProfileContextSummary(profile) || `Perfil ${getProfileLevelLabel(profile)} con ${analysis.daysPerWeek} días por semana.`,
    riskSummary: `Riesgo dedos/hombro/codo: ${analysis.fingerRisk}/${analysis.shoulderRisk}/${analysis.elbowRisk}. Agresividad permitida: ${analysis.allowedAggressiveness}.`,
    equipmentSummary: analysis.equipmentAvailable.length
      ? `Equipo disponible usado por el plan: ${analysis.equipmentAvailable.join(', ')}.`
      : 'Plan armado sin asumir equipo adicional.',
    progressionModel: skeleton.progressionModel,
    weeklyFeedbackPrompt:
      'Al cerrar cada semana registra RPE, dolor de dedos, sueño, energía, qué progresó y qué debe ajustarse.',
    recoveryGuidelines: [
      'Si sueño o energía bajan, reduce una serie por bloque y alarga descansos.',
      'Si dolor sube a 3/10 o aparece dolor punzante, cambia a movilidad y registra el episodio.'
    ],
    safetyRules: skeleton.safetyRules,
    totalWeeks: profile.planDuration,
    currentWeek: 1,
    startDate: now,
    weeks,
    status: 'active',
    createdAt: now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? false,
    librarySources: libraryTraceability?.sourceNames ?? [],
    qualityScores: null
  };
}

async function getLibraryTraceabilityForPlan({
  client,
  profile,
  vectorStoreId
}: {
  client: OpenAI;
  profile: UserProfile;
  vectorStoreId: string;
}) {
  const response = await withOpenAIRetry(() => client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    max_output_tokens: Math.min(700, PLAN_SKELETON_MAX_OUTPUT_TOKENS),
    input: [
      {
        role: 'system',
        content:
          'Eres BilClimb.ai. Consulta la biblioteca con file_search y devuelve solo principios breves de entrenamiento seguro para construir un plan. No incluyas chunks raw.'
      },
      {
        role: 'user',
        content: `Perfil resumido: ${JSON.stringify({
          climbingTime: profile.climbingTime,
          level: profile.level,
          goals: profile.goals,
          goalDescription: profile.goalDescription,
          equipment: profile.equipment,
          injuries: profile.injuries,
          injuryDescription: profile.injuryDescription,
          daysPerWeek: profile.daysPerWeek,
          sessionDuration: profile.sessionDuration
        })}`
      }
    ],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }
    ]
  }));

  return extractLibraryTraceability(response);
}

async function generateWeekWithResponses({
  client,
  profile,
  analysis,
  selectedTemplate,
  skeleton,
  week,
  vectorStoreId,
  validationHints
}: {
  client: OpenAI;
  profile: UserProfile;
  analysis: ProfileAnalysis;
  selectedTemplate: PlanTemplate;
  skeleton: PlanSkeleton;
  week: WeekSkeleton;
  vectorStoreId: string;
  validationHints: string[];
}) {
  const correctionPrompt = validationHints.length
    ? `\n\nCORRECCIONES OBLIGATORIAS PARA ESTE REINTENTO:\n${validationHints
        .map((hint) => `- ${hint}`)
        .join('\n')}`
    : '';
  const allowedExercises = week.sessions.flatMap((session) => session.exerciseCandidates);

  return withOpenAIRetry(() => client.responses.parse({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    max_output_tokens: PLAN_SESSION_MAX_OUTPUT_TOKENS,
    input: [
      {
        role: 'system',
        content:
          'Eres BilClimb.ai. Usa file_search como apoyo, pero respeta el skeleton profesional. Rellena SOLO una semana del plan con detalles seguros y compactos.'
      },
      {
        role: 'user',
        content: `${buildPlanGeneratorPrompt(profile, { analysis, selectedTemplate, skeleton, allowedExercises })}

SEMANA_A_RELLENAR:
${JSON.stringify(compactWeekSkeleton(week), null, 2)}

FORBIDDEN_EXERCISES:
${JSON.stringify(skeleton.forbiddenExercises.slice(0, 24), null, 2)}

SALIDA:
- Devuelve SOLO la semana ${week.weekNumber} como JSON compatible con WeekSchema.
- Mantén títulos, ubicación, stimulusType, dayNumber y duración del skeleton.
- Usa 3 ejercicios de calentamiento total, 3-4 en mainBlock, 1-2 en finalBlock y 2 en cooldown.
- No agregues explicaciones fuera del JSON.${correctionPrompt}`
      }
    ],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }
    ],
    text: {
      format: zodTextFormat(WeekSchema, 'training_plan_week')
    }
  }));
}

export async function POST(request: Request) {
  const subscriptionError = requireSubscriptionAccess();

  if (subscriptionError) {
    return subscriptionError;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to generate a training plan.' },
      { status: 500 }
    );
  }

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    return NextResponse.json(
      { error: 'OPENAI_VECTOR_STORE_ID is required to generate grounded training plans.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { profile?: unknown };

  if (!isUserProfile(body.profile)) {
    return NextResponse.json({ error: 'A valid UserProfile is required.' }, { status: 400 });
  }

  const profile = body.profile;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { analysis, selectedTemplate, skeleton } = buildPlanSkeleton(profile);

  try {
    let validationHints: string[] = [];
    let lastLibraryTraceability: LibraryTraceability | undefined = await getLibraryTraceabilityForPlan({
      client,
      profile,
      vectorStoreId
    });

    if (shouldUseFastPlanBuilder(profile)) {
      const plan = withQualityScores(buildFallbackPlan(profile, lastLibraryTraceability, skeleton), profile);
      const fastPlanViolations = [
        ...getPlanValidationViolations(plan, profile),
        ...getQualityViolations(plan, profile)
      ];

      if (!fastPlanViolations.length) {
        return NextResponse.json({ plan, fallback: true });
      }

      return NextResponse.json(
        {
          error:
            'No pudimos generar un plan suficientemente seguro. Ajusta perfil o intenta de nuevo.',
          validationErrors: fastPlanViolations.slice(0, 10)
        },
        { status: 422 }
      );
    }

    for (let attempt = 1; attempt <= MAX_PLAN_GENERATION_ATTEMPTS; attempt += 1) {
      const generatedWeeks: TrainingPlan['weeks'] = [];
      let attemptTraceability: LibraryTraceability | undefined = lastLibraryTraceability;
      let weekParseFailed = false;

      for (const week of skeleton.weeks) {
        const response = await generateWeekWithResponses({
          client,
          profile,
          analysis,
          selectedTemplate,
          skeleton,
          week,
          vectorStoreId,
          validationHints
        });

        attemptTraceability = mergeLibraryTraceability(
          attemptTraceability,
          extractLibraryTraceability(response)
        );

        if (!response.output_parsed) {
          weekParseFailed = true;
          validationHints = [
            `Semana ${week.weekNumber}: OpenAI no devolvió una semana estructurada compatible con el schema; genera JSON más compacto y completo.`
          ];
          break;
        }

        generatedWeeks.push(response.output_parsed);
      }

      if (weekParseFailed) {
        continue;
      }

      lastLibraryTraceability = attemptTraceability;
      const plan = withQualityScores(
        normalizePlan(
          buildPlanShell({
            profile,
            analysis,
            selectedTemplate,
            skeleton,
            libraryTraceability: attemptTraceability,
            weeks: generatedWeeks
          }),
          profile,
          attemptTraceability,
          skeleton
        ),
        profile
      );
      const validationViolations = [
        ...getPlanValidationViolations(plan, profile),
        ...getQualityViolations(plan, profile)
      ];

      if (!validationViolations.length) {
        return NextResponse.json({ plan });
      }

      validationHints = validationViolations.slice(0, 8);
    }

    const fallbackPlan = withQualityScores(buildFallbackPlan(profile, lastLibraryTraceability, skeleton), profile);
    const fallbackViolations = [
      ...getPlanValidationViolations(fallbackPlan, profile),
      ...getQualityViolations(fallbackPlan, profile)
    ];

    if (!fallbackViolations.length) {
      return NextResponse.json({ plan: fallbackPlan, fallback: true });
    }

    return NextResponse.json(
      {
        error:
          'No pudimos generar un plan suficientemente seguro. Ajusta perfil o intenta de nuevo.',
        validationErrors: [...validationHints, ...fallbackViolations].slice(0, 12)
      },
      { status: 422 }
    );
  } catch (error) {
    if (isOpenAIRateLimitError(error)) {
      return NextResponse.json(
        { error: OPENAI_RATE_LIMIT_MESSAGE, code: 'openai_rate_limited' },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unable to generate plan.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
