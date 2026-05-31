import fs from 'node:fs/promises';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, 'utf8');

    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;

      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) process.env[key] = value;
    });
  } catch {
    // .env.local is optional; never print env values.
  }
}

function baseProfile(overrides) {
  const now = new Date().toISOString();

  return {
    id: `debug-${overrides.id}`,
    character: 'senda',
    name: overrides.name,
    age: '26-35',
    sex: 'na',
    weight: null,
    height: null,
    climbingTime: '1to3',
    disciplines: ['sport', 'boulder'],
    level: 'intermediate',
    setting: 'both',
    injuries: ['none'],
    injuryNotes: '',
    warmup: 'sometimes',
    sleep: 'regular',
    energy: 'normal',
    daysPerWeek: 3,
    equipment: ['bands', 'pullup_bar'],
    equipmentNotes: '',
    previousTraining: 'structured',
    goal: 'technique',
    goals: ['technique'],
    goalDescription: '',
    project: '',
    projectDescription: '',
    sessionDuration: 75,
    maxSessionDuration: 90,
    availableDays: ['monday', 'wednesday', 'saturday'],
    accessToCampusBoard: false,
    accessToHangboard: false,
    accessToTRX: false,
    accessToWeights: false,
    pullUpAbility: '4to8',
    fingerTrainingExperience: 'light',
    campusExperience: 'none',
    currentFingerPain: 0,
    currentShoulderPain: 0,
    currentElbowPain: 0,
    wantsConservativePlan: false,
    trainingAggressiveness: 'balanced',
    outdoorFrequency: 'monthly',
    rockProjectDescription: '',
    sleepQuality: 'regular',
    energyLevel: 'normal',
    injuryDescription: '',
    trainingHistory: 'Entrenamiento estructurado básico con énfasis técnico.',
    planDuration: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

const profiles = [
  baseProfile({
    id: 'beginner-no-gym-finger-pain',
    name: 'Principiante sin gym con dolor dedos',
    climbingTime: 'less1',
    level: 'beginner',
    setting: 'outdoor',
    injuries: ['fingers'],
    injuryNotes: 'Dolor de dedos 2/10 en regletas.',
    equipment: ['home', 'bands', 'pullup_bar'],
    goals: ['technique', 'injury_prevention'],
    goal: 'technique',
    goalDescription: 'Quiero mejorar técnica y base física sin irritar dedos. No tengo climbing gym.',
    currentFingerPain: 2,
    wantsConservativePlan: true,
    trainingAggressiveness: 'conservative',
    fingerTrainingExperience: 'none',
    campusExperience: 'none',
    injuryDescription: 'Dolor de dedos 2/10.',
    trainingHistory: 'Poca experiencia de entrenamiento formal.'
  }),
  baseProfile({
    id: 'intermediate-gym-endurance',
    name: 'Intermedio con gym fuerza-resistencia',
    climbingTime: '1to3',
    level: 'intermediate',
    setting: 'indoor',
    equipment: ['gym', 'bands', 'pullup_bar'],
    goals: ['endurance', 'technique'],
    goal: 'endurance',
    goalDescription: 'Quiero fuerza-resistencia para rutas largas en muro y roca.',
    fingerTrainingExperience: 'light',
    outdoorFrequency: 'monthly'
  }),
  baseProfile({
    id: 'advanced-campus-project',
    name: 'Avanzado con campus y hangboard',
    climbingTime: 'more3',
    level: 'advanced',
    setting: 'both',
    equipment: ['gym', 'rock', 'bands', 'pullup_bar', 'hangboard', 'campus'],
    goals: ['project', 'fingers'],
    goal: 'project',
    goalDescription: 'Quiero un mesociclo para proyecto en roca con trabajo de fuerza, beta y resistencia específica.',
    project: 'Ruta de resistencia con crux de regletas y reposos parciales',
    projectDescription: 'Proyecto en roca con crux de dedos y necesidad de administrar bombeo.',
    rockProjectDescription: 'Proyecto en roca con crux de dedos y reposos parciales.',
    accessToCampusBoard: true,
    accessToHangboard: true,
    fingerTrainingExperience: 'structured',
    campusExperience: 'structured',
    trainingAggressiveness: 'aggressive',
    outdoorFrequency: 'weekly',
    trainingHistory: 'Más de 3 años escalando y entrenamiento estructurado previo.'
  })
];

function flattenPlanText(plan) {
  return JSON.stringify(plan).toLowerCase();
}

function getValidationErrors(plan, profile) {
  const errors = [];
  const text = flattenPlanText(plan);

  if (profile.currentFingerPain > 0 && text.includes('campus')) errors.push('CAMPUS_NOT_ALLOWED');
  if (profile.currentFingerPain > 0 && /(maxhang|hangs máximos|fallo muscular|arqueo máximo)/.test(text)) {
    errors.push('UNSAFE_FINGER_INTENSITY');
  }
  if (!profile.equipment.includes('gym') && /(muro indoor|boulder indoor|gimnasio de escalada)/.test(text)) {
    errors.push('FORBIDDEN_EQUIPMENT');
  }

  (plan.weeks ?? []).forEach((week) => {
    if (!week.progressionFocus && !week.progression && !week.deloadWeek) errors.push(`NO_PROGRESSION:S${week.weekNumber}`);

    (week.sessions ?? []).forEach((session) => {
      if (!session.warmupGeneral?.length) errors.push(`MISSING_GENERAL_WARMUP:S${week.weekNumber}D${session.dayNumber}`);
      if (!session.warmupSpecific?.length) errors.push(`MISSING_SPECIFIC_WARMUP:S${week.weekNumber}D${session.dayNumber}`);
      if (!session.mainBlock?.length) errors.push(`MISSING_MAIN_BLOCK:S${week.weekNumber}D${session.dayNumber}`);
      if (!session.finalBlock?.length) errors.push(`MISSING_FINAL_BLOCK:S${week.weekNumber}D${session.dayNumber}`);

      [...(session.mainBlock ?? []), ...(session.finalBlock ?? [])].forEach((exercise) => {
        if (!exercise.stopIf?.length) errors.push(`MISSING_STOP_IF:${exercise.name}`);
        if (!exercise.regressions?.length) errors.push(`MISSING_REGRESSION:${exercise.name}`);
      });
    });
  });

  return Array.from(new Set(errors));
}

function getStimulusTypes(plan) {
  return (plan.weeks ?? []).map((week) => ({
    weekNumber: week.weekNumber,
    stimulusTypes: (week.sessions ?? []).map((session) => session.stimulusType || session.title)
  }));
}

function hasRepeatedSessions(plan) {
  return (plan.weeks ?? []).some((week) => {
    const signatures = (week.sessions ?? []).map((session) =>
      [session.stimulusType, ...(session.mainBlock ?? []).map((exercise) => exercise.name)].join('|').toLowerCase()
    );

    return new Set(signatures).size < signatures.length;
  });
}

async function generatePlan(endpoint, profile) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return { error: payload?.error || `HTTP ${response.status}`, validationErrors: payload?.validationErrors ?? [] };
  }

  return { plan: payload?.plan, fallback: payload?.fallback };
}

async function main() {
  await loadLocalEnv();

  const appUrl = process.env.DEBUG_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
  const endpoint = new URL('/api/generate-plan', appUrl);

  console.log('ENDPOINT:', endpoint.toString());
  console.log('PROFILES:', profiles.map((profile) => profile.name));

  for (const profile of profiles) {
    console.log('\n---');
    console.log('PROFILE:', profile.name);

    const result = await generatePlan(endpoint, profile);

    if (result.error || !result.plan) {
      console.log('ERROR:', result.error || 'No plan returned');
      console.log('VALIDATION ERRORS:', result.validationErrors ?? []);
      continue;
    }

    const plan = result.plan;
    const validationErrors = getValidationErrors(plan, profile);

    console.log('MESOCYCLE:', plan.mesocycleType);
    console.log('SESSIONS PER WEEK:', (plan.weeks ?? []).map((week) => week.sessions?.length ?? 0));
    console.log('STIMULUS TYPES:', getStimulusTypes(plan));
    console.log('HAS REPETITION:', hasRepeatedSessions(plan));
    console.log('VARIATION SCORE:', plan.qualityScores?.variationScore ?? 'n/a');
    console.log('PROGRESSION SCORE:', plan.qualityScores?.progressionScore ?? 'n/a');
    console.log('SAFETY SCORE:', plan.qualityScores?.safetyScore ?? 'n/a');
    console.log('VALIDATION ERRORS:', validationErrors);
    console.log('USED FILE SEARCH:', Boolean(plan.usedFileSearch));
    console.log('LIBRARY SOURCES:', plan.librarySources ?? []);
    console.log('FIRST SESSION:', {
      title: plan.weeks?.[0]?.sessions?.[0]?.title,
      stimulusType: plan.weeks?.[0]?.sessions?.[0]?.stimulusType,
      objective: plan.weeks?.[0]?.sessions?.[0]?.objective,
      mainBlock: plan.weeks?.[0]?.sessions?.[0]?.mainBlock?.map((exercise) => exercise.name)
    });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'No se pudo ejecutar el debug.';
  console.error('ERROR:', message);
  process.exitCode = 1;
});
