import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { NextResponse } from 'next/server';
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
  return Boolean(
    profile.id &&
      profile.character &&
      profile.climbingTime &&
      profile.goal &&
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

export async function POST(request: Request) {
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
            'Eres BilClimb.ai. Genera planes de entrenamiento seguros, personalizados y estructurados para escaladores.'
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

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate plan.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
