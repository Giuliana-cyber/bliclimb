import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { NextResponse } from 'next/server';
import { requireSubscriptionAccess } from '@/lib/billing/subscription';
import { buildPlanGeneratorPrompt } from '@/lib/prompts/plan-generator';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { TrainingPlanSchema } from '@/lib/ai/training-plan-schema';
import { extractLibraryTraceability, type LibraryTraceability } from '@/lib/ai/response-sources';

export const runtime = 'nodejs';

const MAX_PLAN_GENERATION_ATTEMPTS = 2;

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
  libraryTraceability?: LibraryTraceability
): TrainingPlan {
  const now = new Date().toISOString();

  return {
    ...plan,
    id: plan.id || crypto.randomUUID(),
    profileId: profile.id,
    totalWeeks: profile.planDuration,
    currentWeek: plan.currentWeek || 1,
    status: 'active',
    createdAt: plan.createdAt || now,
    startDate: plan.startDate || now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? plan.usedFileSearch,
    librarySources: libraryTraceability?.sourceNames.length
      ? libraryTraceability.sourceNames
      : plan.librarySources,
    weeks: plan.weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) => ({
        ...session,
        completed: false,
        checkIn: null
      }))
    }))
  };
}

function flattenPlanText(plan: TrainingPlan) {
  return plan.weeks
    .flatMap((week) => [
      week.theme,
      ...week.focusAreas,
      ...week.sessions.flatMap((session) => [
        session.title,
        session.location,
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

      if (session.mainBlock.length < 2) {
        violations.push(`${label}: bloque principal con menos de 2 ejercicios`);
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

function getPlanValidationViolations(plan: TrainingPlan, profile: UserProfile) {
  return [
    ...getLanguageViolations(plan),
    ...getUnavailableEquipmentViolations(plan, profile),
    ...getDetailViolations(plan),
    ...getSafetyViolations(plan, profile)
  ];
}

async function generatePlanWithResponses({
  client,
  profile,
  vectorStoreId,
  validationHints
}: {
  client: OpenAI;
  profile: UserProfile;
  vectorStoreId: string;
  validationHints: string[];
}) {
  const correctionPrompt = validationHints.length
    ? `\n\nCORRECCIONES OBLIGATORIAS PARA ESTE REINTENTO:\n${validationHints
        .map((hint) => `- ${hint}`)
        .join('\n')}`
    : '';

  return client.responses.parse({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'Eres BilClimb.ai. Genera planes de entrenamiento seguros, personalizados, basados en evidencia y estructurados para escaladores. Antes de generar el JSON, usa file_search para consultar la biblioteca de BilClimb. Responde todos los campos de texto en español mexicano y respeta estrictamente el equipo disponible del usuario.'
      },
      {
        role: 'user',
        content: `${buildPlanGeneratorPrompt(profile)}${correctionPrompt}`
      }
    ],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }
    ],
    text: {
      format: zodTextFormat(TrainingPlanSchema, 'training_plan')
    }
  });
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

  try {
    let validationHints: string[] = [];

    for (let attempt = 1; attempt <= MAX_PLAN_GENERATION_ATTEMPTS; attempt += 1) {
      const response = await generatePlanWithResponses({
        client,
        profile,
        vectorStoreId,
        validationHints
      });

      if (!response.output_parsed) {
        validationHints = ['OpenAI no devolvió un plan estructurado compatible con el schema.'];
        continue;
      }

      const libraryTraceability = extractLibraryTraceability(response);
      const plan = normalizePlan(response.output_parsed, profile, libraryTraceability);
      const validationViolations = getPlanValidationViolations(plan, profile);

      if (!validationViolations.length) {
        return NextResponse.json({ plan });
      }

      validationHints = validationViolations.slice(0, 8);
    }

    return NextResponse.json(
      {
        error: `El plan generado no pasó validación: ${validationHints.slice(0, 5).join('; ')}. Intenta regenerarlo.`
      },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate plan.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
