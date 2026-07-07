// Compositor híbrido para derivaciones clínicas de Senda.
//
// Estructura (Opción A aprobada Giuliana 2026-07-07):
//   [warmth LLM opcional] + [NÚCLEO VERBATIM insertado por código]
//
// El núcleo NO pasa por el LLM — se concatena como string. El LLM solo
// escribe una línea de reconocimiento cálido ANTES del núcleo. No hay
// cierre después: el mensaje siempre termina con el texto aprobado.
//
// Blindaje: si la wrap del LLM contiene una frase de la BLACKLIST (que
// minimiza / tranquiliza / sugiere que la consulta puede esperar), se
// DESCARTA silenciosamente y se sirve el núcleo a secas. Log del evento
// para monitoreo.

import type OpenAI from 'openai';
import {
  getSendaDerivation,
  type SendaDerivationKind
} from '../messages/senda-derivations';

// -------------------- Blacklist server-side --------------------
// Frases que la wrap NUNCA puede contener. Si aparece cualquier match,
// se descarta la wrap completa.
export const WARMTH_BLACKLIST: readonly RegExp[] = [
  /no te preocupes/i,
  /seguro no es nada/i,
  /puede que no sea (nada|grave|importante)/i,
  /probablemente no sea (nada|grave|importante)/i,
  /\btranquila\b/i,
  /por las dudas/i,
  /solo por si acaso/i,
  /no es urgente/i,
  /puede esperar/i,
  /no es (nada )?(grave|importante)/i,
  /suele pasar/i,
  /\bes normal\b/i,
  /nada del otro mundo/i,
  /\brelaj[aá]/i
] as const;

export function violatesBlacklist(warmth: string): {
  violates: boolean;
  matched: string[];
} {
  const matched: string[] = [];
  for (const pattern of WARMTH_BLACKLIST) {
    const m = warmth.match(pattern);
    if (m) matched.push(m[0]);
  }
  return { violates: matched.length > 0, matched };
}

// -------------------- Prompt del wrapper LLM --------------------
const WARMTH_SYSTEM_PROMPT = `Sos Senda respondiendo a una atleta que compartió una señal de salud sensible. Tu tarea es SOLO escribir UNA línea corta de reconocimiento cálido en voz de Senda. El mensaje médico real lo agregará el sistema por vos, no tenés que escribirlo.

REGLAS ABSOLUTAS — SI VIOLÁS UNA, TU RESPUESTA SE DESCARTA:
- NO digas "seguro no es nada", "puede que no sea grave", "no te preocupes", "tranquila", ni frases que minimicen la señal.
- NO sugieras que la consulta puede esperar, es opcional, o "por las dudas".
- NO expliques qué puede ser médicamente, ni des tranquilidad clínica.
- NO uses "solo" antes de un profesional ("solo por si acaso") ni frases equivalentes.
- NO uses "es normal", "suele pasar", "nada del otro mundo".
- SÍ: agradecé la confianza, validá lo sentido, con calidez y sin infantilizar.
- Español LATAM neutro, tuteo.
- Máximo 2 oraciones cortas. Sin saludo, sin firma.

Contexto de la usuaria: [mensaje del usuario]
Tipo de derivación: [red-s | amenorrhea | severe-pain]

Devolvé SOLO la línea de reconocimiento, en texto plano.`;

// -------------------- Generación de la wrap --------------------

export type WrapWarmthResult = {
  warmth: string;
  usedFallback: boolean;
  reason?:
    | 'llm-error'
    | 'empty-response'
    | 'blacklist-violation'
    | 'ok';
  matched?: string[];
  error?: string;
};

const KIND_LABEL: Record<SendaDerivationKind, string> = {
  'red-s': 'red-s (pérdida de ciclo por entrenamiento)',
  amenorrhea: 'amenorrhea (ausencia de ciclo varios meses)',
  'severe-pain': 'severe-pain (dolor severo/incapacitante)'
};

/**
 * Llama al LLM para generar la línea de calidez. Devuelve la wrap si es
 * segura, o string vacío + reason si hay que descartar. Fail-safe: si
 * cualquier cosa falla, devuelve string vacío (el compositor sirve solo
 * el núcleo).
 */
export async function generateWarmth(
  client: OpenAI,
  userMessage: string,
  kind: SendaDerivationKind,
  opts: { model?: string } = {}
): Promise<WrapWarmthResult> {
  const model = opts.model ?? process.env.OPENAI_CLASSIFIER_MODEL ?? 'gpt-4o-mini';

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: WARMTH_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Mensaje del usuario:\n"""\n${userMessage.trim()}\n"""\n\n` +
            `Tipo de derivación: ${KIND_LABEL[kind]}`
        }
      ],
      max_tokens: 80,
      temperature: 0.5
    });

    const raw = (completion.choices[0]?.message?.content ?? '').trim();
    if (!raw) {
      return { warmth: '', usedFallback: true, reason: 'empty-response' };
    }

    const { violates, matched } = violatesBlacklist(raw);
    if (violates) {
      return {
        warmth: '',
        usedFallback: true,
        reason: 'blacklist-violation',
        matched
      };
    }

    return { warmth: raw, usedFallback: false, reason: 'ok' };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown';
    return {
      warmth: '',
      usedFallback: true,
      reason: 'llm-error',
      error: errMsg
    };
  }
}

// -------------------- Compositor final --------------------

export type ComposedDerivation = {
  /** Mensaje final concatenado listo para servir al usuario. */
  fullMessage: string;
  /** El núcleo verbatim inalterado — para tests y logging. */
  verbatimCore: string;
  /** La wrap del LLM (vacía si se descartó). */
  warmth: string;
  /** Si se usó fallback (núcleo solo). */
  usedFallback: boolean;
  /** Razón del fallback (si aplica). */
  fallbackReason?: WrapWarmthResult['reason'];
};

/**
 * Compositor final. Toma la wrap generada + kind, y concatena:
 *   [warmth] + '\n\n' + [núcleo verbatim]
 *
 * Garantiza: el núcleo aparece SIEMPRE, letra por letra. La wrap solo
 * antecede. Nunca se generan aditamentos DESPUÉS del núcleo.
 */
export function composeDerivation(
  wrap: WrapWarmthResult,
  kind: SendaDerivationKind
): ComposedDerivation {
  const verbatimCore = getSendaDerivation(kind);

  if (wrap.warmth) {
    return {
      fullMessage: `${wrap.warmth}\n\n${verbatimCore}`,
      verbatimCore,
      warmth: wrap.warmth,
      usedFallback: false
    };
  }

  return {
    fullMessage: verbatimCore,
    verbatimCore,
    warmth: '',
    usedFallback: true,
    fallbackReason: wrap.reason
  };
}
