import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { NextResponse } from 'next/server';
import { requireSubscriptionAccess } from '@/lib/billing/subscription';
import { buildPlanGeneratorPrompt } from '@/lib/prompts/plan-generator';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { TrainingPlanSchema } from '@/lib/ai/training-plan-schema';

export const runtime = 'nodejs';

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

function normalizePlan(plan: TrainingPlan, profile: UserProfile): TrainingPlan {
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

  const body = (await request.json()) as { profile?: unknown };

  if (!isUserProfile(body.profile)) {
    return NextResponse.json({ error: 'A valid UserProfile is required.' }, { status: 400 });
  }

  const profile = body.profile;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Eres BilClimb.ai. Genera planes de entrenamiento seguros, personalizados y estructurados para escaladores. Responde todos los campos de texto en español mexicano y respeta estrictamente el equipo disponible del usuario.'
        },
        {
          role: 'user',
          content: buildPlanGeneratorPrompt(profile)
        }
      ],
      text: {
        format: zodTextFormat(TrainingPlanSchema, 'training_plan')
      }
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: 'OpenAI did not return a structured training plan.' },
        { status: 502 }
      );
    }

    const plan = normalizePlan(response.output_parsed, profile);
    const equipmentViolations = getUnavailableEquipmentViolations(plan, profile);

    if (equipmentViolations.length > 0) {
      return NextResponse.json(
        {
          error: `El plan generado incluyó equipo no disponible: ${equipmentViolations.join(', ')}. Intenta regenerarlo.`
        },
        { status: 502 }
      );
    }

    const detailViolations = getDetailViolations(plan);

    if (detailViolations.length > 0) {
      return NextResponse.json(
        {
          error: `El plan generado no tiene suficiente detalle práctico: ${detailViolations.slice(0, 5).join('; ')}. Intenta regenerarlo.`
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate plan.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
