import fs from 'node:fs/promises';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, 'utf8');

    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return;
      }

      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');

      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // Optional in CI; never print env values.
  }
}

function buildDebugProfile() {
  const now = new Date().toISOString();

  return {
    id: 'debug-professional-plan',
    character: 'senda',
    name: 'Perfil debug',
    age: '26-35',
    sex: 'female',
    weight: null,
    height: null,
    climbingTime: '1to3',
    disciplines: ['sport', 'boulder'],
    level: 'intermediate',
    setting: 'outdoor',
    injuries: ['fingers'],
    injuryNotes: 'Dolor de dedos 2/10 al arquear o apretar regletas pequeñas.',
    warmup: 'sometimes',
    sleep: 'regular',
    energy: 'normal',
    daysPerWeek: 3,
    equipment: ['home', 'bands', 'pullup_bar', 'rock'],
    equipmentNotes: 'No tengo climbing gym. Tengo bandas, barra de dominadas y acceso a roca los fines de semana.',
    previousTraining: 'structured',
    goal: 'technique',
    goals: ['technique', 'fingers'],
    goalDescription:
      'Quiero mejorar fuerza y técnica para rutas en roca sin irritar los dedos. Necesito un plan profesional con progresión y seguridad.',
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
    currentFingerPain: 2,
    currentShoulderPain: 0,
    currentElbowPain: 0,
    wantsConservativePlan: true,
    trainingAggressiveness: 'conservative',
    outdoorFrequency: 'weekly',
    rockProjectDescription: 'Rutas de deportiva en roca, agarres pequeños ocasionales y prioridad de técnica de pies.',
    sleepQuality: 'regular',
    energyLevel: 'normal',
    injuryDescription: 'Dolor de dedos 2/10 al arquear o apretar regletas pequeñas.',
    trainingHistory: 'Plan estructurado básico, sin campus y poca experiencia formal de dedos.',
    planDuration: 4,
    createdAt: now,
    updatedAt: now
  };
}

function collectPlanText(plan) {
  return [
    plan.mesocycleType,
    plan.mainObjective,
    plan.riskSummary,
    ...(plan.weeks ?? []).flatMap((week) => [
      week.theme,
      week.microcycle,
      week.progression,
      ...(week.sessions ?? []).flatMap((session) => [
        session.title,
        session.objective,
        session.why,
        session.intensityTarget,
        ...(session.safetyNotes ?? []),
        ...(session.adjustmentRules ?? []),
        ...(session.successCriteria ?? []),
        ...[
          ...(session.warmupGeneral ?? []),
          ...(session.warmupSpecific ?? []),
          ...(session.mainBlock ?? []),
          ...(session.finalBlock ?? []),
          ...(session.cooldown ?? [])
        ].flatMap((exercise) => [
          exercise.name,
          exercise.description,
          exercise.reps,
          exercise.rest,
          exercise.intensity,
          exercise.intensityPercent,
          ...(exercise.stopIf ?? []),
          ...(exercise.regressions ?? [])
        ])
      ])
    ])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function validatePlan(plan) {
  const errors = [];
  const text = collectPlanText(plan);
  const weeks = plan.weeks ?? [];

  if (!plan.mesocycleType) errors.push('Falta mesocycleType.');
  if (!plan.mainObjective) errors.push('Falta mainObjective.');
  if (!plan.recoveryGuidelines?.length) errors.push('Faltan recoveryGuidelines.');
  if (!plan.weeklyFeedbackPrompt) errors.push('Falta weeklyFeedbackPrompt.');
  if (text.includes('campus')) errors.push('Con dolor dedos 2/10 no debe incluir campus.');
  if (text.includes('maxhang') || text.includes('hangs máximos')) {
    errors.push('Con dolor dedos 2/10 no debe incluir hangs máximos.');
  }

  weeks.forEach((week) => {
    if (!week.microcycle && !week.progression) {
      errors.push(`Semana ${week.weekNumber}: falta microciclo/progresión.`);
    }

    (week.sessions ?? []).forEach((session) => {
      const label = `Semana ${week.weekNumber}, día ${session.dayNumber}`;
      if (!session.warmupGeneral?.length) errors.push(`${label}: falta calentamiento general.`);
      if (!session.warmupSpecific?.length) errors.push(`${label}: falta calentamiento específico.`);
      if (!session.mainBlock?.length) errors.push(`${label}: falta parte principal.`);
      if (!session.finalBlock?.length) errors.push(`${label}: falta parte final.`);

      [...(session.mainBlock ?? []), ...(session.finalBlock ?? [])].forEach((exercise) => {
        if (!exercise.stopIf?.length) errors.push(`${label}: ${exercise.name} no tiene stopIf.`);
        if (!exercise.regressions?.length) errors.push(`${label}: ${exercise.name} no tiene regressions.`);
      });
    });
  });

  return errors;
}

async function main() {
  await loadLocalEnv();

  const appUrl = process.env.DEBUG_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
  const endpoint = new URL('/api/generate-plan', appUrl);
  const profile = buildDebugProfile();

  console.log('ENDPOINT:', endpoint.toString());
  console.log('PROFILE:', {
    gym: false,
    equipment: profile.equipment,
    fingerPain: profile.currentFingerPain,
    daysPerWeek: profile.daysPerWeek,
    goals: profile.goals
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.log('STATUS:', response.status);
    console.log('ERROR:', payload?.error || payload || 'No se pudo generar el plan.');
    process.exitCode = 1;
    return;
  }

  const plan = payload?.plan;

  if (!plan) {
    console.log('ERROR: La API no devolvió plan.');
    process.exitCode = 1;
    return;
  }

  const firstWeek = plan.weeks?.[0];
  const firstSession = firstWeek?.sessions?.[0];
  const validationErrors = validatePlan(plan);

  console.log('MESOCYCLE:', plan.mesocycleType);
  console.log('MAIN OBJECTIVE:', plan.mainObjective);
  console.log('WEEKS:', plan.weeks?.length ?? 0);
  console.log('SESSIONS PER WEEK:', plan.weeks?.map((week) => week.sessions?.length ?? 0) ?? []);
  console.log('USED FILE SEARCH:', Boolean(plan.usedFileSearch));
  console.log('SOURCES:', plan.librarySources ?? []);
  console.log('VALIDATION ERRORS:', validationErrors);
  console.log('FIRST SESSION:', {
    title: firstSession?.title,
    objective: firstSession?.objective,
    why: firstSession?.why,
    intensityTarget: firstSession?.intensityTarget,
    warmupGeneral: firstSession?.warmupGeneral?.map((exercise) => exercise.name),
    warmupSpecific: firstSession?.warmupSpecific?.map((exercise) => exercise.name),
    mainBlock: firstSession?.mainBlock?.map((exercise) => exercise.name),
    finalBlock: firstSession?.finalBlock?.map((exercise) => exercise.name),
    safetyNotes: firstSession?.safetyNotes
  });

  if (validationErrors.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'No se pudo ejecutar el debug.';
  console.error('ERROR:', message);
  process.exitCode = 1;
});
