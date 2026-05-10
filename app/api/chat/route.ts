import OpenAI from 'openai';
import { NextResponse } from 'next/server';
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

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    return NextResponse.json(
      { error: 'OPENAI_VECTOR_STORE_ID is required to use file search.' },
      { status: 500 }
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const encoder = new TextEncoder();

  function sse(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.responses.create({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          input: [
            {
              role: 'system',
              content: buildCoachSystemPrompt({
                profile: body.profile ?? null
              })
            },
            ...messages.map((message) => ({
              role: message.role,
              content: message.content
            }))
          ],
          tools: [
            {
              type: 'file_search',
              vector_store_ids: [vectorStoreId]
            }
          ],
          stream: true
        });

        for await (const event of response) {
          if (event.type === 'response.output_text.delta') {
            controller.enqueue(sse('delta', { text: event.delta }));
          }

          if (event.type === 'response.completed') {
            controller.enqueue(sse('done', {}));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to answer chat message.';
        controller.enqueue(sse('error', { message }));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
