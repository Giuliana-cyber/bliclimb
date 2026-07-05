// Orquestador de la regla §3.15 — dos capas.
//
// Une:
//   - Capa 1 (weight-topic-keywords): detección amplia y rápida en Node.
//   - Capa 2 (weight-intent-classifier): clasificación via LLM, solo si
//     capa 1 disparó.
//
// Contrato: devuelve una decisión estructurada que el consumidor
// (chat/route.ts) usa para elegir entre "responder la derivación fija"
// o "seguir el flujo normal de Bill".
//
// Fail-safe: si capa 2 falla, derivar. La duda va del lado seguro.

import type OpenAI from 'openai';
import {
  detectWeightTopic,
  type WeightTopicHit
} from './weight-topic-keywords';
import {
  classifyWeightIntent,
  type ConversationTurn,
  type WeightIntent
} from './weight-intent-classifier';

export type WeightDerivationDecision =
  | {
      derive: false;
      reason: 'no-keyword';   // capa 1 no disparó
      layer1: WeightTopicHit;
    }
  | {
      derive: false;
      reason: 'informational' | 'other';  // capa 2 filtró
      layer1: WeightTopicHit;
      layer2: { intent: WeightIntent; raw?: string };
    }
  | {
      derive: true;
      reason: 'change-weight' | 'fail-safe';
      layer1: WeightTopicHit;
      layer2: { intent: WeightIntent; raw?: string; error?: string };
    };

/**
 * Ejecuta la orquestación completa para un mensaje del usuario.
 *
 * Latencia:
 *   - Sin trigger de capa 1 → <1ms (sin llamada LLM).
 *   - Con trigger → 500-800ms (una llamada a gpt-4o-mini).
 *
 * @param client OpenAI client (SDK oficial). Se inyecta para tests.
 * @param userMessage último mensaje del usuario (raw).
 * @param context últimos turnos previos (para desambiguar en capa 2).
 * @param opts.model override del modelo del clasificador.
 */
export async function checkWeightDerivation(
  client: OpenAI,
  userMessage: string,
  context: ConversationTurn[] = [],
  opts: { model?: string } = {}
): Promise<WeightDerivationDecision> {
  const layer1 = detectWeightTopic(userMessage);
  if (!layer1.hit) {
    return { derive: false, reason: 'no-keyword', layer1 };
  }

  const layer2 = await classifyWeightIntent(client, userMessage, context, {
    model: opts.model
  });

  if (layer2.error) {
    // Fail-safe: cualquier error de capa 2 → derivar.
    return {
      derive: true,
      reason: 'fail-safe',
      layer1,
      layer2: { intent: layer2.intent, raw: layer2.raw, error: layer2.error }
    };
  }

  if (layer2.intent === 'change-weight') {
    return {
      derive: true,
      reason: 'change-weight',
      layer1,
      layer2: { intent: layer2.intent, raw: layer2.raw }
    };
  }

  // 'informational' o 'other' → NO derivar, flujo normal.
  return {
    derive: false,
    reason: layer2.intent,
    layer1,
    layer2: { intent: layer2.intent, raw: layer2.raw }
  };
}
