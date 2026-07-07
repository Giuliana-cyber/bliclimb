// Layer 2 del detector de señal clínica de ciclo — LLM classifier.
//
// Distingue 5 categorías finales para decidir qué derivación servir (o
// dejar que Senda responda natural cuando la señal es variación normal).
//
// Fail-safe: cualquier error del LLM → 'amenorrhea' (Derivación 2, la más
// genérica). La duda va del lado seguro: mejor over-derive con mensaje
// genérico que dejar pasar una señal clínica real.

import type OpenAI from 'openai';
import type { CycleSignalHit } from './cycle-signal-keywords';

export type CycleClassifierCategory =
  | 'variacion-normal'
  | 'clinical-red-s'
  | 'clinical-amenorrhea'
  | 'clinical-severe-pain'
  | 'other';

export type CycleClassifyResult = {
  category: CycleClassifierCategory;
  raw?: string;
  error?: string;
};

export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `Sos un clasificador de señales de salud femenina. Analizás el mensaje del usuario y decidís en qué categoría entra.

Contexto: la app tiene una coach llamada Senda. Cuando el usuario dice algo de su ciclo, dolor, o cuerpo, hay 5 categorías:

- "clinical-red-s": el usuario menciona que el ciclo/menstruación desapareció Y lo asocia con haber subido la carga/volumen/intensidad de entrenamiento. Ejemplos:
    "no me baja hace 4 meses desde que aumenté el entrenamiento"
    "desapareció mi ciclo cuando subí el volumen"
    "empecé un plan más duro y ya no me viene"

- "clinical-amenorrhea": ausencia de menstruación por 3 o más meses SIN mencionar training como causa (o sin mención de causa). Ejemplos:
    "hace 5 meses que no me viene"
    "sin menstruación desde marzo"
    "amenorrea"

- "clinical-severe-pain": dolor severo, incapacitante, que impide moverse o no responde a analgésicos. Incluye dolor no menstrual (ej: dolor de dedos severo). Ejemplos:
    "dolor insoportable, no puedo moverme"
    "el ibuprofeno no me hace nada"
    "me deja tirada en cama"

- "variacion-normal": mención del ciclo como variación esperada de fisiología femenina — energía baja en menstruación, más fuerte en folicular, calambres esperables, etc. NO es señal clínica. Ejemplos:
    "estoy en mis días y sin energía"
    "estoy ovulando y me siento fuerte"
    "en fase lútea siempre me pasa esto"

- "other": el keyword disparó pero no encaja en ninguna clínica ni es variación normal (mención tangencial, negación, pregunta neutra). Ejemplos:
    "¿el ciclo afecta el rendimiento?"
    "no me duele nada en realidad"
    "una amiga tuvo amenorrea"

REGLAS:
1. Si hay ausencia (3+ meses) + training link → "clinical-red-s".
2. Si hay ausencia (3+ meses) sin training link explícito → "clinical-amenorrhea".
3. Si hay ausencia con < 3 meses o tiempo indeterminado, evaluá si el contexto sugiere clínica.
4. Si hay dolor severo/incapacitante/no responde a analgésicos → "clinical-severe-pain".
5. Si es variación normal esperada → "variacion-normal".
6. En duda entre variación-normal y clínica → clínica (lado seguro).

Respondé exactamente:
{"category": "clinical-red-s" | "clinical-amenorrhea" | "clinical-severe-pain" | "variacion-normal" | "other"}`;

function buildUserBlock(
  userMessage: string,
  context: ConversationTurn[],
  layer1: CycleSignalHit
): string {
  const contextLines = context
    .map((t) => `${t.role === 'user' ? 'Usuario' : 'Senda'}: ${t.content.trim()}`)
    .join('\n');

  const l1Summary: string[] = [];
  if (layer1.domains.absence.length > 0)
    l1Summary.push(`absence: ${layer1.domains.absence.join(', ')}`);
  if (layer1.domains.trainingLink.length > 0)
    l1Summary.push(`trainingLink: ${layer1.domains.trainingLink.join(', ')}`);
  if (layer1.domains.severity.length > 0)
    l1Summary.push(`severity: ${layer1.domains.severity.join(', ')}`);
  if (layer1.domains.functionalImpact.length > 0)
    l1Summary.push(`functionalImpact: ${layer1.domains.functionalImpact.join(', ')}`);
  if (layer1.domains.painkillerIneffective.length > 0)
    l1Summary.push(
      `painkillerIneffective: ${layer1.domains.painkillerIneffective.join(', ')}`
    );
  if (layer1.monthsElapsed !== null)
    l1Summary.push(`monthsElapsed: ${layer1.monthsElapsed}`);

  return [
    'Mensaje del usuario a clasificar:',
    '"""',
    userMessage.trim(),
    '"""',
    '',
    'Señales detectadas por Layer 1 (pre-clasificación):',
    l1Summary.length > 0 ? l1Summary.join('\n') : '(ninguna)',
    '',
    'Contexto reciente de la conversación:',
    '"""',
    contextLines || '(sin contexto previo)',
    '"""'
  ].join('\n');
}

function isValidCategory(x: unknown): x is CycleClassifierCategory {
  return (
    x === 'clinical-red-s' ||
    x === 'clinical-amenorrhea' ||
    x === 'clinical-severe-pain' ||
    x === 'variacion-normal' ||
    x === 'other'
  );
}

/**
 * Ejecuta Layer 2. Fail-safe: cualquier error → 'clinical-amenorrhea'
 * (Derivación 2, la más genérica del set clínico).
 */
export async function classifyCycleSignal(
  client: OpenAI,
  userMessage: string,
  layer1: CycleSignalHit,
  context: ConversationTurn[] = [],
  opts: { model?: string } = {}
): Promise<CycleClassifyResult> {
  const model = opts.model ?? process.env.OPENAI_CLASSIFIER_MODEL ?? 'gpt-4o-mini';

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserBlock(userMessage, context, layer1) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 60,
      temperature: 0
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        category: 'clinical-amenorrhea',
        raw,
        error: 'json-parse-failed'
      };
    }

    const category = (parsed as { category?: unknown }).category;
    if (!isValidCategory(category)) {
      return {
        category: 'clinical-amenorrhea',
        raw,
        error: 'invalid-category-value'
      };
    }

    return { category, raw };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown';
    return {
      category: 'clinical-amenorrhea',
      error: `llm-call-failed: ${errMsg}`
    };
  }
}
