import type { UserProfile } from '@/lib/profile';
import { MAX_EXERCISE_CANDIDATES_PER_SESSION } from '@/lib/ai/token-budget';
import { analyzeProfile, type ProfileAnalysis } from '@/lib/planning/profile-analysis';
import { EXERCISE_CATALOG, type CatalogExercise } from '@/lib/planning/exercise-catalog';
import { selectPlanTemplate, type PlanTemplate } from '@/lib/planning/plan-templates';
import { getSessionBlueprint, type StimulusType } from '@/lib/planning/session-blueprints';

export type SkeletonExerciseCandidate = Pick<
  CatalogExercise,
  | 'id'
  | 'name'
  | 'category'
  | 'requiredEquipment'
  | 'riskLevel'
  | 'objective'
  | 'defaultDose'
  | 'defaultRest'
  | 'progressions'
  | 'regressions'
  | 'howTo'
  | 'stopIf'
  | 'commonMistakes'
  | 'feelCues'
  | 'sourceConcept'
>;

export type SessionSkeleton = {
  weekNumber: number;
  dayNumber: number;
  dayLabel: string;
  stimulusType: StimulusType;
  title: string;
  objective: string;
  why: string;
  location: string;
  estimatedDurationMinutes: number;
  intensityTarget: string;
  requiredBlocks: Array<'warmupGeneral' | 'warmupSpecific' | 'mainBlock' | 'finalBlock' | 'cooldown'>;
  candidateExerciseIds: string[];
  exerciseCandidates: SkeletonExerciseCandidate[];
  restrictions: string[];
  successCriteria: string[];
  adjustmentRules: string[];
  safetyNotes: string[];
};

export type WeekSkeleton = {
  weekNumber: number;
  microcycleId: string;
  objective: string;
  progressionFocus: string;
  loadLevel: string;
  deloadWeek: boolean;
  sessions: SessionSkeleton[];
};

export type PlanSkeleton = {
  planVersion: 'planner-v1';
  mesocycleType: string;
  templateId: string;
  templateName: string;
  microcycles: PlanTemplate['microcycles'];
  planningRationale: string;
  progressionModel: string;
  weeks: WeekSkeleton[];
  forbiddenExercises: string[];
  safetyRules: string[];
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const FALLBACK_DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const PLAN_SKELETON_CANDIDATE_LIMIT = MAX_EXERCISE_CANDIDATES_PER_SESSION;

function hasEquipment(exercise: CatalogExercise, analysis: ProfileAnalysis) {
  return exercise.requiredEquipment.every((equipment) => {
    if (equipment === 'gym') return analysis.hasGymAccess;
    if (equipment === 'rock') return analysis.hasRockAccess;
    if (equipment === 'pullup_bar') return analysis.hasPullupBar;
    if (equipment === 'bands') return analysis.hasBands;
    if (equipment === 'trx') return analysis.hasTRX;
    if (equipment === 'weights') return analysis.hasWeights;
    if (equipment === 'campus') return analysis.canUseCampus;
    if (equipment === 'hangboard') return analysis.canUseHangboard;
    return analysis.equipmentAvailable.includes(equipment);
  });
}

function isExerciseAllowed(exercise: CatalogExercise, analysis: ProfileAnalysis) {
  if (!hasEquipment(exercise, analysis)) return false;
  if (analysis.fingerRisk !== 'bajo' && !exercise.allowedWithFingerPain) return false;
  if (analysis.shoulderRisk !== 'bajo' && !exercise.allowedWithShoulderPain) return false;
  if (exercise.id.includes('campus') && !analysis.canUseCampus) return false;
  if (exercise.id.includes('hangboard') && !analysis.canUseHangboard) return false;

  return true;
}

function getForbiddenExercises(analysis: ProfileAnalysis) {
  return EXERCISE_CATALOG.filter((exercise) => !isExerciseAllowed(exercise, analysis)).map(
    (exercise) => exercise.id
  );
}

function isStimulusAllowed(stimulusType: StimulusType, analysis: ProfileAnalysis) {
  if (['resistencia_4x4', 'bloque_trabajado'].includes(stimulusType) && !analysis.hasGymAccess) {
    return false;
  }
  if (stimulusType === 'via_trabajada' && !analysis.hasRockAccess) return false;
  if (stimulusType === 'fuerza_dedos_submaxima' && analysis.fingerRisk !== 'bajo') return false;
  if (stimulusType === 'fuerza_dedos_submaxima' && !analysis.canUseHangboard && !analysis.hasPullupBar) {
    return false;
  }

  return true;
}

function safeStimulusFallback(stimulusType: StimulusType, index: number, analysis: ProfileAnalysis): StimulusType {
  if (isStimulusAllowed(stimulusType, analysis)) return stimulusType;

  const fallback: StimulusType[] = analysis.hasRockAccess
    ? ['via_trabajada', 'fuerza_general', 'tecnica_pies', 'antagonistas_preventivo', 'movilidad_recuperacion']
    : ['tecnica_pies', 'fuerza_general', 'core', 'antagonistas_preventivo', 'movilidad_recuperacion'];

  return fallback[index % fallback.length];
}

function avoidConsecutiveFingerStimulus(current: StimulusType, previous: StimulusType | null) {
  if (previous !== 'fuerza_dedos_submaxima') return current;
  if (current !== 'fuerza_dedos_submaxima') return current;
  return 'antagonistas_preventivo';
}

function getWeekMicrocycle(template: PlanTemplate, weekNumber: number) {
  return (
    template.microcycles.find((microcycle) => microcycle.weeks.includes(weekNumber)) ??
    template.microcycles[template.microcycles.length - 1]
  );
}

function getWeekStimuli(template: PlanTemplate, analysis: ProfileAnalysis, weekNumber: number) {
  const base = template.weeklyStimulusDistribution[Math.min(analysis.daysPerWeek, 5)] ??
    template.weeklyStimulusDistribution[3];
  let previous: StimulusType | null = null;

  return base.slice(0, analysis.daysPerWeek).map((stimulusType, index) => {
    const weekAdjusted = weekNumber % 4 === 0 && index === base.length - 1 ? 'descarga' : stimulusType;
    const safeStimulus = safeStimulusFallback(weekAdjusted, index, analysis);
    const finalStimulus = avoidConsecutiveFingerStimulus(safeStimulus, previous);
    previous = finalStimulus;
    return finalStimulus;
  });
}

function getSessionLocation(stimulusType: StimulusType, analysis: ProfileAnalysis) {
  if (stimulusType === 'via_trabajada') return 'roca';
  if (['resistencia_4x4', 'bloque_trabajado'].includes(stimulusType)) return 'gym';
  if (stimulusType === 'fuerza_dedos_submaxima' && analysis.canUseHangboard) return 'casa/hangboard';
  return 'casa';
}

function getCandidateExercises(stimulusType: StimulusType, analysis: ProfileAnalysis) {
  const direct = EXERCISE_CATALOG.filter(
    (exercise) => exercise.stimulusTypes.includes(stimulusType) && isExerciseAllowed(exercise, analysis)
  );
  const universalWarmup = EXERCISE_CATALOG.filter((exercise) =>
    ['movilidad-general', 'calentamiento-dinamico', 'activacion-escapular'].includes(exercise.id)
  ).filter((exercise) => isExerciseAllowed(exercise, analysis));
  const support = EXERCISE_CATALOG.filter(
    (exercise) =>
      ['plancha-frontal', 'hollow-body', 'extensores-banda', 'aperturas-dedos-banda', 'pistol-squat-regresion'].includes(
        exercise.id
      ) && isExerciseAllowed(exercise, analysis)
  );

  const candidates = Array.from(
    new Map([...universalWarmup, ...direct, ...support].map((exercise) => [exercise.id, exercise])).values()
  );

  return candidates
    .sort((first, second) => {
      const firstDirect = first.stimulusTypes.includes(stimulusType) ? 0 : 1;
      const secondDirect = second.stimulusTypes.includes(stimulusType) ? 0 : 1;
      const riskOrder: Record<CatalogExercise['riskLevel'], number> = { bajo: 0, medio: 1, alto: 2 };
      const equipmentOrder = first.requiredEquipment.length - second.requiredEquipment.length;

      return (
        firstDirect - secondDirect ||
        riskOrder[first.riskLevel] - riskOrder[second.riskLevel] ||
        equipmentOrder ||
        first.name.localeCompare(second.name, 'es')
      );
    })
    .slice(0, PLAN_SKELETON_CANDIDATE_LIMIT);
}

function toCandidate(exercise: CatalogExercise): SkeletonExerciseCandidate {
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    requiredEquipment: exercise.requiredEquipment,
    riskLevel: exercise.riskLevel,
    objective: exercise.objective,
    defaultDose: exercise.defaultDose,
    defaultRest: exercise.defaultRest,
    progressions: exercise.progressions,
    regressions: exercise.regressions,
    howTo: exercise.howTo,
    stopIf: exercise.stopIf,
    commonMistakes: exercise.commonMistakes,
    feelCues: exercise.feelCues,
    sourceConcept: exercise.sourceConcept
  };
}

function buildSessionSkeleton({
  analysis,
  weekNumber,
  dayNumber,
  dayLabel,
  stimulusType,
  microcycle
}: {
  analysis: ProfileAnalysis;
  weekNumber: number;
  dayNumber: number;
  dayLabel: string;
  stimulusType: StimulusType;
  microcycle: ReturnType<typeof getWeekMicrocycle>;
}): SessionSkeleton {
  const blueprint = getSessionBlueprint(stimulusType);
  const exerciseCandidates = getCandidateExercises(stimulusType, analysis).map(toCandidate);
  const deloadPrefix = microcycle.deloadWeek ? 'Descarga: ' : '';

  return {
    weekNumber,
    dayNumber,
    dayLabel,
    stimulusType,
    title: `${dayLabel}: ${deloadPrefix}${blueprint.title}`,
    objective: blueprint.objective,
    why: `Esta sesión existe para cumplir el microciclo "${microcycle.objective}" sin romper restricciones de equipo, dolor ni progresión.`,
    location: getSessionLocation(stimulusType, analysis),
    estimatedDurationMinutes: Math.min(analysis.maxSessionDuration, blueprint.typicalDuration),
    intensityTarget: microcycle.deloadWeek ? 'RPE 2-4, volumen reducido' : blueprint.intensityTarget,
    requiredBlocks: blueprint.requiredBlocks,
    candidateExerciseIds: exerciseCandidates.map((exercise) => exercise.id),
    exerciseCandidates,
    restrictions: [
      ...analysis.criticalRestrictions,
      `No cambiar stimulusType: ${stimulusType}.`,
      'No cambiar frecuencia semanal ni equipo.',
      'No usar ejercicios fuera del catálogo salvo variante más segura.'
    ],
    successCriteria: [
      'Termina con técnica limpia y margen de 2 repeticiones/movimientos.',
      'Dolor no sube durante ni después de la sesión.',
      'Puedes anotar una decisión concreta para la siguiente semana.'
    ],
    adjustmentRules: [
      'Si RPE sube más de 2 puntos sobre objetivo, reduce una serie o alarga descanso.',
      'Si dolor sube a 3/10, cambia a movilidad/antagonistas y termina la carga.',
      'Si no tienes el equipo exacto, usa solo candidatos permitidos equivalentes.'
    ],
    safetyNotes: analysis.safetyRules
  };
}

export function buildPlanSkeleton(profile: UserProfile) {
  const analysis = analyzeProfile(profile);
  const template = selectPlanTemplate(analysis);
  const totalWeeks = Math.max(1, Math.min(profile.planDuration || template.recommendedDurationWeeks, 12));
  const weeks: WeekSkeleton[] = Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const microcycle = getWeekMicrocycle(template, weekNumber);
    const stimuli = getWeekStimuli(template, analysis, weekNumber);

    return {
      weekNumber,
      microcycleId: microcycle.id,
      objective: microcycle.objective,
      progressionFocus: microcycle.progressionFocus,
      loadLevel: microcycle.loadLevel,
      deloadWeek: microcycle.deloadWeek,
      sessions: stimuli.map((stimulusType, sessionIndex) => {
        const rawDay = analysis.daysAvailable[sessionIndex];
        const dayLabel = rawDay ? DAY_LABELS[rawDay] ?? rawDay : FALLBACK_DAY_LABELS[sessionIndex] ?? `Día ${sessionIndex + 1}`;

        return buildSessionSkeleton({
          analysis,
          weekNumber,
          dayNumber: sessionIndex + 1,
          dayLabel,
          stimulusType,
          microcycle
        });
      })
    };
  });

  const skeleton: PlanSkeleton = {
    planVersion: 'planner-v1',
    mesocycleType: `${template.name} · ${totalWeeks} semanas`,
    templateId: template.id,
    templateName: template.name,
    microcycles: template.microcycles,
    planningRationale: `Se eligió "${template.name}" por objetivo ${analysis.mainGoal}, nivel ${analysis.climbingLevel}, equipo ${analysis.equipmentAvailable.join(', ') || 'sin equipo'} y riesgo de dedos ${analysis.fingerRisk}.`,
    progressionModel: template.expectedProgression.join(' → '),
    weeks,
    forbiddenExercises: getForbiddenExercises(analysis),
    safetyRules: Array.from(new Set([...analysis.safetyRules, ...template.safetyRules]))
  };

  return { analysis, selectedTemplate: template, skeleton };
}
