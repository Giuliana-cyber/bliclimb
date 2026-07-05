// Capa 2 de la regla §3.15 — clasificador de intención vía LLM.
//
// Corre SOLO si la capa 1 (keyword detection) disparó. Le pregunta a un
// modelo si el mensaje del usuario expresa:
//   - 'change-weight'   → INTENCIÓN o CONDUCTA de cambiar peso corporal
//                         → dispara derivación (Bill no responde nada más)
//   - 'informational'   → pregunta neutra sobre el tema
//                         → NO dispara derivación, chat normal
//   - 'other'           → menciona el tema pero contexto trivial
//                         → NO dispara derivación, chat normal
//
// Modelo: gpt-4o-mini con temperature 0, response_format json_object,
// max_tokens 50. Override via OPENAI_CLASSIFIER_MODEL env. Latencia
// esperada 500-800ms.
//
// Fail-safe (decisión de Giuliana): si la llamada falla, timeout, o el
// modelo devuelve JSON inválido → devolver 'change-weight'. La duda va
// del lado seguro (derivar).

import type OpenAI from 'openai';

export type WeightIntent = 'change-weight' | 'informational' | 'other';

export type ClassifyResult = {
  intent: WeightIntent;
  raw?: string;              // respuesta cruda del modelo, para logging
  error?: string;            // si hubo fail-safe, qué pasó
};

/**
 * Historial reciente que damos al classifier para desambiguar mensajes
 * como "y vos qué pensás?" cuyo sentido depende del turno previo.
 * Últimos 3 turnos (6 mensajes user+assistant alternando).
 */
export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `Sos un clasificador. Analizás el mensaje del usuario y decidís en qué categoría entra respecto al tema "peso corporal / composición corporal / dieta". Respondé SOLO con JSON válido, sin texto extra.

Categorías:

- "change-weight": el usuario expresa INTENCIÓN o CONDUCTA de cambiar su peso o composición corporal (bajar, subir, adelgazar, perder grasa, restringir comida, ayunar, etc.), o pide ayuda para hacerlo. Ejemplos:
    "quiero bajar de peso"
    "estoy tratando de perder grasa"
    "cómo hago para adelgazar y escalar mejor"
    "quiero estar más liviano"
    "empecé un ayuno intermitente"

- "informational": pregunta neutra o curiosa SOBRE peso/dieta, SIN intención personal de cambiar. Ejemplos:
    "¿el peso afecta el grado?"
    "¿cuánto pesan los escaladores élite?"
    "¿qué dice la ciencia sobre el peso en escalada?"

- "other": el mensaje menciona algo del tema pero no cae en las anteriores. Incluye NEGACIONES claras del usuario ("no quiero bajar de peso"), menciones triviales, o contexto casual.

Respondé exactamente:
{"intent": "change-weight" | "informational" | "other"}`;

function buildUserBlock(userMessage: string, context: ConversationTurn[]): string {
  const contextLines = context
    .map((t) => `${t.role === 'user' ? 'Usuario' : 'Bill'}: ${t.content.trim()}`)
    .join('\n');
  return [
    'Mensaje del usuario a clasificar:',
    '"""',
    userMessage.trim(),
    '"""',
    '',
    'Contexto reciente de la conversación (últimos turnos, para desambiguar):',
    '"""',
    contextLines || '(sin contexto previo)',
    '"""'
  ].join('\n');
}

function isValidIntent(x: unknown): x is WeightIntent {
  return x === 'change-weight' || x === 'informational' || x === 'other';
}

/**
 * Ejecuta la clasificación. Fail-safe: cualquier error → 'change-weight'.
 */
export async function classifyWeightIntent(
  client: OpenAI,
  userMessage: string,
  context: ConversationTurn[] = [],
  opts: { model?: string; timeoutMs?: number } = {}
): Promise<ClassifyResult> {
  const model = opts.model ?? process.env.OPENAI_CLASSIFIER_MODEL ?? 'gpt-4o-mini';

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserBlock(userMessage, context) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
      temperature: 0
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        intent: 'change-weight',
        raw,
        error: 'json-parse-failed'
      };
    }

    const intent = (parsed as { intent?: unknown })?.intent;
    if (!isValidIntent(intent)) {
      return {
        intent: 'change-weight',
        raw,
        error: 'invalid-intent-value'
      };
    }

    return { intent, raw };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return {
      intent: 'change-weight',
      error: `llm-call-failed: ${errMsg}`
    };
  }
}
