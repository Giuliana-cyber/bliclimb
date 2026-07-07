// Orquestador de derivaciones clínicas de Senda.
//
// Une:
//   Layer 1  (cycle-signal-keywords)    — detección determinística
//   Layer 2  (cycle-signal-classifier)  — LLM classifier con 5 categorías
//   Composer (senda-warmth-composer)    — envuelve núcleo verbatim
//
// Decisión final:
//   Layer 1 no dispara               → { derive: false, reason: 'no-signal' }
//   Layer 2 = variacion-normal       → { derive: false, reason: 'variacion-normal' }
//   Layer 2 = other                  → { derive: false, reason: 'other' }
//   Layer 2 = clinical-*             → { derive: true, category, composed }
//
// Fail-safe (heredado de Layer 2): error de classifier → default a
// clinical-amenorrhea (Derivación 2, la más genérica).

import type OpenAI from 'openai';
import {
  detectCycleSignal,
  type CycleSignalHit
} from './cycle-signal-keywords';
import {
  classifyCycleSignal,
  type CycleClassifierCategory,
  type CycleClassifyResult,
  type ConversationTurn
} from './cycle-signal-classifier';
import {
  composeDerivation,
  generateWarmth,
  type ComposedDerivation
} from './senda-warmth-composer';
import type { SendaDerivationKind } from '../messages/senda-derivations';

export type SendaDerivationDecision =
  | {
      derive: false;
      reason: 'no-signal';
      layer1: CycleSignalHit;
    }
  | {
      derive: false;
      reason: 'variacion-normal' | 'other';
      layer1: CycleSignalHit;
      layer2: CycleClassifyResult;
    }
  | {
      derive: true;
      category: CycleClassifierCategory & (`clinical-${string}`);
      kind: SendaDerivationKind;
      layer1: CycleSignalHit;
      layer2: CycleClassifyResult;
      composed: ComposedDerivation;
    };

function categoryToKind(
  category: CycleClassifierCategory
): SendaDerivationKind | null {
  switch (category) {
    case 'clinical-red-s':
      return 'red-s';
    case 'clinical-amenorrhea':
      return 'amenorrhea';
    case 'clinical-severe-pain':
      return 'severe-pain';
    default:
      return null;
  }
}

/**
 * Ejecuta la orquestación completa para un mensaje de usuario a Senda.
 *
 * Latencia:
 *   - Sin trigger de Layer 1 → <1ms.
 *   - Con trigger → Layer 2 (500-800ms) + Warmth (500-800ms) → ~1-1.5s total.
 *
 * Solo llamar cuando character === 'senda' (no aplica a Bill).
 */
export async function checkSendaDerivation(
  client: OpenAI,
  userMessage: string,
  context: ConversationTurn[] = [],
  opts: { classifierModel?: string; warmthModel?: string } = {}
): Promise<SendaDerivationDecision> {
  const layer1 = detectCycleSignal(userMessage);
  if (!layer1.hit) {
    return { derive: false, reason: 'no-signal', layer1 };
  }

  const layer2 = await classifyCycleSignal(client, userMessage, layer1, context, {
    model: opts.classifierModel
  });

  if (layer2.category === 'variacion-normal') {
    return { derive: false, reason: 'variacion-normal', layer1, layer2 };
  }
  if (layer2.category === 'other') {
    return { derive: false, reason: 'other', layer1, layer2 };
  }

  const kind = categoryToKind(layer2.category);
  if (!kind) {
    // Impossible con isValidCategory de Layer 2, pero defensivo.
    return { derive: false, reason: 'other', layer1, layer2 };
  }

  const wrap = await generateWarmth(client, userMessage, kind, {
    model: opts.warmthModel
  });
  const composed = composeDerivation(wrap, kind);

  return {
    derive: true,
    category: layer2.category as CycleClassifierCategory & `clinical-${string}`,
    kind,
    layer1,
    layer2,
    composed
  };
}
