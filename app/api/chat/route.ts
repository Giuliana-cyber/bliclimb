import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { CheckIn } from '@/lib/checkin';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { gateChat } from '@/lib/billing/gates';
import { enforceRateLimit } from '@/lib/rate-limit';
import { buildCoachSystemPrompt } from '@/lib/prompts/coach-system';
import { extractLibraryTraceability } from '@/lib/ai/response-sources';
import { CHAT_MAX_OUTPUT_TOKENS } from '@/lib/ai/token-budget';
import { ChatRequestSchema } from '@/lib/schemas/user-profile';

export const runtime = 'nodejs';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  profile?: UserProfile | null;
  character?: UserProfile['character'];
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
  const limit = await enforceRateLimit('chat');
  if (!limit.ok) {
    return NextResponse.json(
      {
        code: 'rate_limited',
        error: limit.userMessage,
        resetSeconds: limit.resetSeconds
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.resetSeconds) }
      }
    );
  }

  const gate = await gateChat();
  if (!gate.allowed) return gate.response;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to use the chat coach.' },
      { status: 500 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_chat_payload', issues: [{ message: 'Body no es JSON válido.' }] },
      { status: 400 }
    );
  }

  const parsed = ChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_chat_payload',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const validated = parsed.data;
  const messages = validated.messages.filter(isChatMessage);
  const body = rawBody as ChatRequestBody;
  const checkIns = Array.isArray(body.checkIns) ? body.checkIns.slice(0, 5) : [];
  const plan = body.plan && typeof body.plan === 'object' ? body.plan : null;
  const character = validated.character;

  if (!messages.length) {
    return NextResponse.json(
      { error: 'invalid_chat_payload', issues: [{ message: 'Mensajes requeridos.' }] },
      { status: 400 }
    );
  }

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    return NextResponse.json(
      { error: 'OPENAI_VECTOR_STORE_ID is required to use file search.' },
      { status: 500 }
    );
  }

  // timeout: 30s. Si OpenAI tarda más, el SDK aborta y atajamos en el catch
  // de abajo para devolver 504 en vez de colgar la Vercel function.
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000
  });
  const encoder = new TextEncoder();

  function sse(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.responses.create({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          max_output_tokens: CHAT_MAX_OUTPUT_TOKENS,
          input: [
            {
              role: 'system',
              content: buildCoachSystemPrompt({
                profile: body.profile ?? null,
                character,
                plan,
                checkIns
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
            controller.enqueue(sse('done', extractLibraryTraceability(event.response)));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to answer chat message.';
        // Si OpenAI superó el timeout de 30s o cerró la conexión, mandamos
        // un evento upstream_timeout para que la UI pueda mostrar un mensaje
        // específico ("el servicio de IA tardó demasiado") en vez de un
        // genérico "algo falló".
        const isTimeout =
          error instanceof Error &&
          (error.name === 'APIConnectionTimeoutError' ||
            error.name === 'APIConnectionError' ||
            /timeout|aborted/i.test(error.message));
        if (isTimeout) {
          controller.enqueue(
            sse('error', {
              code: 'upstream_timeout',
              message: 'El servicio de IA tardó demasiado. Intentá de nuevo.'
            })
          );
        } else {
          controller.enqueue(sse('error', { message }));
        }
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
