import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { CheckIn } from '@/lib/checkin';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { buildCoachSystemPrompt } from '@/lib/prompts/coach-system';

export const runtime = 'nodejs';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  profile?: UserProfile | null;
  plan?: TrainingPlan | null;
  checkIns?: CheckIn[];
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Partial<ChatMessage>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to use the chat coach.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as ChatRequestBody;
  const messages = Array.isArray(body.messages) ? body.messages.filter(isChatMessage) : [];

  if (!messages.length) {
    return NextResponse.json({ error: 'At least one chat message is required.' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: buildCoachSystemPrompt({
            profile: body.profile ?? null,
            plan: body.plan ?? null,
            checkIns: body.checkIns ?? []
          })
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ]
    });

    return NextResponse.json({ message: response.output_text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to answer chat message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
