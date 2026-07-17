/**
 * Motor invertido · plan-generator · Fase 2 · orquestador end-to-end.
 *
 * Toma un profile + focus, produce una sesión ensamblada:
 *   1. Filtra pool por categoría
 *   2. Restringe pool aplicando gates + risk + equipment
 *   3. Construye prompt + Zod schema (fail-closed por z.enum)
 *   4. Llama a OpenAI con structured output
 *   5. Ensambla la sesión desde IDs + catálogo curado
 *
 * Fail-closed en 2 puntos:
 *   - Zod z.enum(eligibleIds) → OpenAI rechaza IDs fuera del pool en generación
 *   - assembler valida ID contra catálogo (defensa en profundidad)
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { Catalog, FocusObject, Profile } from './types';
import { filterByCategory } from './catalog-loader';
import { restrictPool } from './restrict-pool';
import { buildSlicePrompt } from './prompt-builder';
import { assemble, type AssembledSession } from './assembler';

export interface PlanGeneratorOptions {
  category: string; // 'fuerza-dedos' en Fase 2
  nExercises: number;
  sessionTheme?: string;
  model?: string;
  openai?: OpenAI;
}

export async function generateSession(params: {
  catalog: Catalog;
  profile: Profile;
  focus: FocusObject;
  options: PlanGeneratorOptions;
}): Promise<{
  session: AssembledSession;
  meta: {
    eligibleCount: number;
    blockedCount: number;
    tokensUsed?: number;
    latencyMs: number;
  };
}> {
  const { catalog, profile, focus, options } = params;
  const t0 = Date.now();

  // 1. Filtro por categoría
  const categoryPool = filterByCategory(catalog, options.category);

  // 2. Restringe por gates + risk + equipment
  const poolResult = restrictPool(catalog, categoryPool, profile, focus);

  if (poolResult.eligible.length < options.nExercises) {
    throw new Error(
      `motor-inverted · pool restringido tiene ${poolResult.eligible.length} elegibles, ` +
        `necesitamos ${options.nExercises}. No podemos armar sesión sin inventar.`,
    );
  }

  // 3. Prompt + schema con z.enum de IDs elegibles
  const build = buildSlicePrompt({
    catalog,
    eligibleIds: poolResult.eligible,
    profile,
    focus,
    nExercises: options.nExercises,
    sessionTheme: options.sessionTheme,
  });

  // 4. OpenAI structured output — fail-closed por z.enum
  const client = options.openai ?? new OpenAI();
  const model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  // Cast local: el schema dinámico con z.enum(elegibleIds) no expone
  // el tipo inferido al TS estático, pero validamos exhaustivo en runtime.
  interface ParsedSlice {
    sessionTitle: string;
    sessionRationale: string;
    exercises: Array<{
      exerciseId: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }>;
  }

  const completion = await client.chat.completions.parse({
    model,
    temperature: 0.3,
    response_format: zodResponseFormat(build.schema, 'plan_slice'),
    messages: [
      { role: 'system', content: build.systemPrompt },
      { role: 'user', content: build.userPrompt },
    ],
  });

  const llmResponseRaw = completion.choices[0]?.message.parsed as
    | ParsedSlice
    | null
    | undefined;
  if (!llmResponseRaw) {
    throw new Error('motor-inverted · OpenAI no devolvió parsed response');
  }
  const llmResponse: ParsedSlice = llmResponseRaw;

  const tokensUsed = completion.usage?.total_tokens;

  // 5. Ensambla desde catálogo curado
  const session = assemble({
    llmResponse,
    catalog,
    poolResult,
    profile,
    focus,
  });

  return {
    session,
    meta: {
      eligibleCount: poolResult.eligible.length,
      blockedCount: poolResult.blocked.length,
      tokensUsed,
      latencyMs: Date.now() - t0,
    },
  };
}
