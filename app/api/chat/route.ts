import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { CheckIn } from '@/lib/checkin';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { gateChat } from '@/lib/billing/gates';
import { checkRateLimit, commitRateLimit } from '@/lib/rate-limit';
import { buildCoachSystemPrompt } from '@/lib/prompts/coach-system';
import { extractLibraryTraceability } from '@/lib/ai/response-sources';
import { CHAT_MAX_OUTPUT_TOKENS } from '@/lib/ai/token-budget';
import { ChatRequestSchema } from '@/lib/schemas/user-profile';
import { checkWeightDerivation } from '@/lib/brain/detection/section-03-15-orchestrator';
import { buildFixedResponseStream } from '@/lib/brain/detection/fixed-response-stream';
import { getDerivationMessage } from '@/lib/brain/messages/section-03-15';
import { checkChatHints } from '@/lib/brain/orchestrator/chat-hints';
import { ConsoleLogSink } from '@/lib/brain/logging';
import type { ConversationTurn } from '@/lib/brain/detection/weight-intent-classifier';

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
  // Orden: gateChat (auth + sub) → validaciones baratas (body parse,
  // schema, mensajes presentes) → checkRateLimit → OpenAI → commitRateLimit.
  // El rate limit se gasta solo cuando el request es válido y vamos a
  // tirar trabajo real contra OpenAI.
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

  // Check rate limit (no incrementa). Todas las validaciones 4xx baratas
  // pasaron; el commit ocurre adentro del stream una vez que OpenAI nos
  // confirmó la apertura.
  const rl = await checkRateLimit('chat');
  if (!rl.ok) {
    return NextResponse.json(
      {
        code: 'rate_limited',
        error: rl.userMessage,
        resetSeconds: rl.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) }
      }
    );
  }

  // timeout: 120s — consistente con generate-plan ahora que estamos en
  // Vercel Pro (maxDuration 300s). El chat es streaming, así que el
  // primer token suele llegar en < 5s; 120s solo aplica si OpenAI se
  // queda colgada antes del primer token o entre chunks. Si tarda más,
  // el SDK aborta y atajamos en el catch de abajo para emitir un evento
  // upstream_timeout en lugar de colgar la function.
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120_000
  });
  const encoder = new TextEncoder();

  function sse(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // ---------- §3.15 pérdida de peso — dos capas, corren ANTES del stream ----------
  //
  // Capa 1 (keywords, <1ms) + capa 2 (LLM classifier, 500-800ms si capa 1
  // dispara). Si el orchestrator decide derivar, respondemos con el
  // mensaje fijo de derivación y SILENCIO TOTAL de Bill — no se llama a
  // client.responses.create() en absoluto. La regla es dura (Doc 02 §3.15).
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const conversationContext: ConversationTurn[] = messages
    .slice(-6) // hasta 3 turnos user+assistant
    .map((m) => ({ role: m.role, content: m.content }));

  const weightDecision = await checkWeightDerivation(
    client,
    lastUserMessage,
    conversationContext
  );

  if (weightDecision.derive) {
    // Consumimos rate limit — hicimos trabajo real (potencialmente una
    // llamada LLM del classifier) y vamos a devolver una respuesta.
    await commitRateLimit('chat');

    // Log estructurado — misma sink que sub-fases 1/2/3.
    new ConsoleLogSink().logBlock({
      section: 'section-03-15',
      rule: '3.15',
      profileId: body.profile?.id ?? null,
      kind: 'derivation-weight',
      weightKeywords: weightDecision.layer1.matched,
      weightIntent: weightDecision.layer2.intent,
      weightReason: weightDecision.reason,
      weightError:
        weightDecision.reason === 'fail-safe'
          ? weightDecision.layer2.error
          : undefined,
      timestamp: new Date().toISOString()
    });

    const derivationStream = buildFixedResponseStream(
      getDerivationMessage('3.15')
    );
    return new Response(derivationStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  }

  // ---------- §10.3 / §10.4 — hints reactivos, corren DESPUÉS de §3.15 ----------
  //
  // Detección liviana de síntomas de enfermedad (§10.3) y N+ intentos en un
  // proyecto (§10.4). Distinto de §3.15: NO silencia a Bill; le pasa un
  // system message extra para que contextualice la respuesta en su voz.
  // §3.15 tiene precedencia (si derivó arriba, este bloque no corre).
  const chatHints = checkChatHints(lastUserMessage);
  for (const evt of chatHints.logEvents) {
    console.log(JSON.stringify(evt));
  }

  // Flujo normal — no hay derivación, Bill responde con streaming.
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
            // Hints §10.3/§10.4 como system messages adicionales — Bill los
            // lee como instrucción del sistema, no como turno de conversación.
            ...chatHints.hints.map((hint) => ({
              role: 'system' as const,
              content: hint
            })),
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

        // OpenAI nos confirmó la apertura del stream. A partir de acá
        // tenemos una conversación válida — consumimos el token del
        // rate limit. Si el stream falla mid-vuelo, el usuario igual
        // recibió respuesta parcial; no refundamos.
        await commitRateLimit('chat');

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
