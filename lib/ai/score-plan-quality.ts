import type { PlanQualityScores, TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { flattenPlanText, validateProfessionalPlan } from '@/lib/ai/validate-professional-plan';

const SCORE_FLOOR = 0;
const SCORE_CEILING = 100;
export const MINIMUM_PLAN_SCORE = 68;

function clamp(value: number) {
  return Math.max(SCORE_FLOOR, Math.min(SCORE_CEILING, Math.round(value)));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sessionSignature(session: TrainingPlan['weeks'][number]['sessions'][number]) {
  return [
    session.stimulusType,
    ...session.mainBlock.map((exercise) => normalizeText(exercise.name)).sort()
  ]
    .filter(Boolean)
    .join('|');
}

function getAllSessions(plan: TrainingPlan) {
  return plan.weeks.flatMap((week) => week.sessions);
}

function scoreVariation(plan: TrainingPlan) {
  const signatures = getAllSessions(plan).map(sessionSignature).filter(Boolean);
  if (!signatures.length) return 0;

  const uniqueRatio = new Set(signatures).size / signatures.length;
  const stimulusTypes = signatures.map((signature) => signature.split('|')[0]).filter(Boolean);
  const stimulusRatio = stimulusTypes.length ? new Set(stimulusTypes).size / Math.min(stimulusTypes.length, 5) : 0;

  return clamp(uniqueRatio * 70 + stimulusRatio * 30);
}

function scoreProgression(plan: TrainingPlan) {
  let score = 25;

  if (plan.progressionModel) score += 20;
  if (plan.microcycles?.length) score += 15;

  const weeksWithProgression = plan.weeks.filter(
    (week) => week.progressionFocus || week.progression || week.deloadWeek
  ).length;
  score += (weeksWithProgression / Math.max(plan.weeks.length, 1)) * 40;

  return clamp(score);
}

function scoreSafety(plan: TrainingPlan, profile: UserProfile) {
  const validation = validateProfessionalPlan(plan, profile);
  const safetyErrors = validation.errors.filter((error) =>
    ['UNSAFE_FINGER_INTENSITY', 'FORBIDDEN_EQUIPMENT', 'CAMPUS_NOT_ALLOWED', 'HANGBOARD_NOT_ALLOWED'].includes(
      error.code
    )
  );

  return clamp(100 - safetyErrors.length * 25);
}

function scoreSpecificity(plan: TrainingPlan) {
  const exercises = getAllSessions(plan).flatMap((session) => [
    ...session.warmup,
    ...(session.warmupGeneral ?? []),
    ...(session.warmupSpecific ?? []),
    ...session.mainBlock,
    ...(session.finalBlock ?? []),
    ...session.cooldown
  ]);

  if (!exercises.length) return 0;

  const detailed = exercises.filter(
    (exercise) =>
      exercise.description.length >= 80 &&
      Boolean(exercise.prescription || exercise.sets || exercise.reps || exercise.duration) &&
      Boolean(exercise.howTo?.length) &&
      Boolean(exercise.stopIf?.length) &&
      Boolean(exercise.regressions?.length)
  ).length;

  return clamp((detailed / exercises.length) * 100);
}

function scoreEquipmentFit(plan: TrainingPlan, profile: UserProfile) {
  const validation = validateProfessionalPlan(plan, profile);
  const equipmentErrors = validation.errors.filter((error) =>
    ['FORBIDDEN_EQUIPMENT', 'CAMPUS_NOT_ALLOWED', 'HANGBOARD_NOT_ALLOWED'].includes(error.code)
  );

  return clamp(100 - equipmentErrors.length * 30);
}

function scoreProfessionalStructure(plan: TrainingPlan) {
  const sessions = getAllSessions(plan);
  if (!sessions.length) return 0;

  const completeSessions = sessions.filter(
    (session) =>
      session.stimulusType &&
      session.objective &&
      session.why &&
      session.warmupGeneral?.length &&
      session.warmupSpecific?.length &&
      session.mainBlock.length &&
      session.finalBlock?.length &&
      session.successCriteria?.length &&
      session.adjustmentRules?.length &&
      session.safetyNotes?.length
  ).length;
  const topLevel = [
    plan.mesocycleType,
    plan.mainObjective,
    plan.planningRationale,
    plan.progressionModel,
    plan.recoveryGuidelines?.length ? 'recovery' : '',
    plan.weeklyFeedbackPrompt
  ].filter(Boolean).length;

  return clamp((completeSessions / sessions.length) * 75 + (topLevel / 6) * 25);
}

export function scorePlanQuality(plan: TrainingPlan, profile: UserProfile): PlanQualityScores {
  return {
    variationScore: scoreVariation(plan),
    progressionScore: scoreProgression(plan),
    safetyScore: scoreSafety(plan, profile),
    specificityScore: scoreSpecificity(plan),
    equipmentFitScore: scoreEquipmentFit(plan, profile),
    professionalStructureScore: scoreProfessionalStructure(plan)
  };
}

export function getLowQualityReasons(scores: PlanQualityScores) {
  return Object.entries(scores)
    .filter(([, score]) => score < MINIMUM_PLAN_SCORE)
    .map(([key, score]) => `${key}: ${score}/100`);
}

export function summarizePlanQuality(plan: TrainingPlan, profile: UserProfile) {
  const scores = scorePlanQuality(plan, profile);
  const text = flattenPlanText(plan);

  return {
    scores,
    lowQualityReasons: getLowQualityReasons(scores),
    hasProfessionalLanguage: text.includes('microciclo') || text.includes('mesociclo')
  };
}
