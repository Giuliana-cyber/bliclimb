import type { UserProfile } from '@/lib/profile';

export type PainRisk = 'bajo' | 'medio' | 'alto' | 'critico';
export type PlanningAggressiveness = 'conservador' | 'normal' | 'exigente';
export type TrainingGoal =
  | 'tecnica'
  | 'fuerza_dedos'
  | 'fuerza_resistencia'
  | 'proyecto_roca'
  | 'retorno_lesion'
  | 'mantenimiento'
  | 'base';

export type ProfileAnalysis = {
  climbingLevel: UserProfile['level'];
  trainingExperience: string;
  fingerTrainingExperience: string;
  campusExperience: string;
  fingerRisk: PainRisk;
  shoulderRisk: PainRisk;
  elbowRisk: PainRisk;
  equipmentAvailable: string[];
  hasGymAccess: boolean;
  hasRockAccess: boolean;
  hasBands: boolean;
  hasPullupBar: boolean;
  hasTRX: boolean;
  hasWeights: boolean;
  canUseCampus: boolean;
  canUseHangboard: boolean;
  daysAvailable: string[];
  daysPerWeek: number;
  maxSessionDuration: number;
  mainGoal: TrainingGoal;
  secondaryGoal: TrainingGoal | null;
  allowedAggressiveness: PlanningAggressiveness;
  criticalRestrictions: string[];
  safetyRules: string[];
  shouldAvoidFingerIntensity: boolean;
  shouldAvoidMaxStrength: boolean;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function painToRisk(score: number): PainRisk {
  if (score >= 4) return 'critico';
  if (score >= 3) return 'alto';
  if (score >= 1) return 'medio';
  return 'bajo';
}

function normalizeGoal(goal: string | undefined): TrainingGoal {
  switch (goal) {
    case 'fingers':
      return 'fuerza_dedos';
    case 'endurance':
      return 'fuerza_resistencia';
    case 'project':
      return 'proyecto_roca';
    case 'return':
      return 'retorno_lesion';
    case 'technique':
      return 'tecnica';
    case 'injury_prevention':
      return 'mantenimiento';
    default:
      return 'base';
  }
}

function getPrimaryGoal(profile: UserProfile): TrainingGoal {
  const goals = profile.goals?.length ? profile.goals : [profile.goal];
  const text = [
    profile.goalDescription,
    profile.projectDescription,
    profile.rockProjectDescription,
    profile.project
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (profile.injuries.some((injury) => injury !== 'none')) return 'retorno_lesion';
  if (text.includes('proyecto') || text.includes('encaden') || goals.includes('project')) {
    return 'proyecto_roca';
  }
  if (goals.includes('fingers')) return 'fuerza_dedos';
  if (goals.includes('endurance')) return 'fuerza_resistencia';
  if (goals.includes('technique')) return 'tecnica';
  if (goals.includes('return')) return 'retorno_lesion';

  return normalizeGoal(goals[0]);
}

function getSecondaryGoal(profile: UserProfile, primary: TrainingGoal): TrainingGoal | null {
  const goals = profile.goals?.length ? profile.goals : [profile.goal];
  const mappedGoals = goals.map(normalizeGoal).filter((goal) => goal !== primary);

  return mappedGoals[0] ?? null;
}

function getAggressiveness(profile: UserProfile, fingerPain: number, shoulderPain: number, elbowPain: number) {
  if (
    profile.wantsConservativePlan ||
    profile.trainingAggressiveness === 'conservative' ||
    fingerPain > 0 ||
    shoulderPain > 0 ||
    elbowPain > 0 ||
    profile.injuries.some((injury) => injury !== 'none')
  ) {
    return 'conservador' satisfies PlanningAggressiveness;
  }

  if (profile.trainingAggressiveness === 'aggressive') {
    return 'exigente' satisfies PlanningAggressiveness;
  }

  return 'normal' satisfies PlanningAggressiveness;
}

function includesEquipment(profile: UserProfile, item: string) {
  return profile.equipment.includes(item as UserProfile['equipment'][number]);
}

export function analyzeProfile(profile: UserProfile): ProfileAnalysis {
  const fingerPain = toNumber(profile.currentFingerPain);
  const shoulderPain = toNumber(profile.currentShoulderPain);
  const elbowPain = toNumber(profile.currentElbowPain);
  const mainGoal = getPrimaryGoal(profile);
  const secondaryGoal = getSecondaryGoal(profile, mainGoal);
  const equipmentAvailable = Array.from(
    new Set([
      ...profile.equipment,
      profile.accessToTRX ? 'trx' : null,
      profile.accessToWeights ? 'weights' : null,
      profile.accessToCampusBoard ? 'campus' : null,
      profile.accessToHangboard ? 'hangboard' : null
    ].filter((value): value is string => Boolean(value)))
  );

  const hasGymAccess = includesEquipment(profile, 'gym');
  const hasRockAccess = includesEquipment(profile, 'rock') || Boolean(profile.rockProjectDescription?.trim());
  const hasBands = includesEquipment(profile, 'bands');
  const hasPullupBar = includesEquipment(profile, 'pullup_bar');
  const hasTRX = includesEquipment(profile, 'trx') || profile.accessToTRX;
  const hasWeights = includesEquipment(profile, 'weights') || profile.accessToWeights;
  const hasCampusBoard = includesEquipment(profile, 'campus') || profile.accessToCampusBoard;
  const hasHangboard = includesEquipment(profile, 'hangboard') || profile.accessToHangboard;
  const campusExperience = profile.campusExperience || 'none';
  const fingerExperience = profile.fingerTrainingExperience || 'none';
  const isNewerClimber = profile.climbingTime === 'start' || profile.climbingTime === 'less1';
  const canUseCampus =
    hasCampusBoard &&
    fingerPain === 0 &&
    campusExperience !== 'none' &&
    !isNewerClimber &&
    (profile.level === 'advanced' || profile.level === 'elite');
  const canUseHangboard =
    hasHangboard &&
    fingerPain === 0 &&
    fingerExperience !== 'none' &&
    !isNewerClimber &&
    profile.age !== 'u16';
  const allowedAggressiveness = getAggressiveness(profile, fingerPain, shoulderPain, elbowPain);
  const maxSessionDuration = Math.max(35, profile.maxSessionDuration || profile.sessionDuration || 75);
  const criticalRestrictions: string[] = [];
  const safetyRules: string[] = [];

  if (!hasGymAccess) criticalRestrictions.push('Sin acceso a gym/muro: no usar bloques indoor, 4x4 en muro ni boulder de gimnasio.');
  if (!canUseCampus) criticalRestrictions.push('Campus no permitido para este perfil.');
  if (!canUseHangboard) criticalRestrictions.push('Hangboard intenso no permitido para este perfil.');
  if (fingerPain > 0) {
    criticalRestrictions.push('Dolor de dedos activo: usar dedos solo submáximo, sin fallo ni agarre arqueado máximo.');
    safetyRules.push('Parar si dolor de dedos sube a 3/10 o aparece dolor punzante.');
  }
  if (fingerPain >= 4) criticalRestrictions.push('Dolor de dedos alto: no generar entrenamiento intenso de dedos.');
  if (shoulderPain > 0) safetyRules.push('Evitar tracción explosiva o rango doloroso de hombro.');
  if (elbowPain > 0) safetyRules.push('Evitar alto volumen de tracción y agarre sostenido si irrita el codo.');
  if (!hasWeights) criticalRestrictions.push('Sin pesas: usar peso corporal, bandas, barra, roca o movilidad.');

  return {
    climbingLevel: profile.level,
    trainingExperience: profile.trainingHistory || profile.previousTraining || 'no especificada',
    fingerTrainingExperience: fingerExperience,
    campusExperience,
    fingerRisk: painToRisk(fingerPain),
    shoulderRisk: painToRisk(shoulderPain),
    elbowRisk: painToRisk(elbowPain),
    equipmentAvailable,
    hasGymAccess,
    hasRockAccess,
    hasBands,
    hasPullupBar,
    hasTRX,
    hasWeights,
    canUseCampus,
    canUseHangboard,
    daysAvailable: profile.availableDays?.length ? profile.availableDays : [],
    daysPerWeek: Math.max(1, Math.min(profile.daysPerWeek || 3, 5)),
    maxSessionDuration,
    mainGoal,
    secondaryGoal,
    allowedAggressiveness,
    criticalRestrictions,
    safetyRules: [
      ...safetyRules,
      'Dejar margen técnico; no entrenar al fallo.',
      'Reducir una variable si el sueño, energía o dolor empeoran.'
    ],
    shouldAvoidFingerIntensity: fingerPain > 0 || !canUseHangboard,
    shouldAvoidMaxStrength: allowedAggressiveness === 'conservador'
  };
}
