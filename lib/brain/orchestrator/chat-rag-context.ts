// Capa B para el chat runtime — recupera chunks del vector store
// explícitamente (client.vectorStores.search) para poder sanitizarlos
// ANTES de pasarlos al LLM. Reemplaza el file_search inline en las tools
// de responses.create que no da punto de intercepción pre-LLM.
//
// Simetría con el flow de generate-plan:
//   generate-plan: groundFromLibrary → extractText → stripExplicitAttributions
//   chat:          fetchAndSanitizeChatRag → search → stripExplicitAttributions
//
// Latencia esperada: 200-500ms del vector_stores.search. Comparable a la
// llamada de checkWeightDerivation en §3.15.
//
// Fail-safe: si la search falla (5xx de OpenAI, rate limit, etc), devuelve
// context vacío y NO rompe el chat — Bill responde sin biblioteca esa vez.

import type OpenAI from 'openai';
import { stripExplicitAttributions } from '../sanitizers/citation-sanitizer';

export type ChatRagResult = {
  /** Texto limpio (post Capa B) listo para inyectar como system message. */
  context: string;
  /** Metadata para el SSE 'done' event — lo consume la UI. */
  traceability: {
    usedFileSearch: boolean;
    sourceNames: string[];
  };
  /** Stats del sanitizer + info del search para logging. */
  stats: {
    linesStripped: number;
    sectionsStripped: number;
    phrasesReplaced: number;
    rawLength: number;
    cleanedLength: number;
    resultCount: number;
  };
};

const EMPTY_RESULT: ChatRagResult = {
  context: '',
  traceability: { usedFileSearch: false, sourceNames: [] },
  stats: {
    linesStripped: 0,
    sectionsStripped: 0,
    phrasesReplaced: 0,
    rawLength: 0,
    cleanedLength: 0,
    resultCount: 0
  }
};

/**
 * Toma los últimos hasta 3 mensajes de la conversación y arma un query
 * de búsqueda. Descarta labels de role (semantic search no los necesita).
 * Trunca a 2000 chars para no inflar el token count.
 *
 * Razón para 3 mensajes: si el último es "¿y para eso qué hago?", el
 * mensaje solo no alcanza para elegir chunks relevantes; necesita al
 * menos el turno del asistente anterior + la pregunta original.
 */
export function buildSearchQuery(
  messages: ReadonlyArray<{ role: string; content: string }>
): string {
  const lastFew = messages.slice(-3);
  const joined = lastFew.map((m) => m.content ?? '').join('\n');
  return joined.slice(0, 2000).trim();
}

/**
 * Recupera chunks del vector store y los pasa por el sanitizer. Función
 * pura excepto por la llamada al SDK — el `client` se inyecta para
 * facilitar tests.
 */
export async function fetchAndSanitizeChatRag(
  client: OpenAI,
  vectorStoreId: string,
  query: string,
  opts: { maxNumResults?: number } = {}
): Promise<ChatRagResult> {
  if (!query || !vectorStoreId) return EMPTY_RESULT;

  try {
    const searchRes = await client.vectorStores.search(vectorStoreId, {
      query,
      max_num_results: opts.maxNumResults ?? 5
    });

    // `search` retorna PagePromise; el await da la primera page. Como
    // pedimos max_num_results ≤ 5 alcanza con esa page sin paginación.
    const results = (searchRes as unknown as { data?: Array<{
      filename: string;
      content: Array<{ text: string; type: string }>;
    }> }).data ?? [];

    if (results.length === 0) return EMPTY_RESULT;

    const rawChunks = results
      .flatMap((r) => (r.content ?? []).map((c) => c.text ?? ''))
      .filter((t) => t.length > 0)
      .join('\n\n');

    const { cleaned, stats: sanStats } = stripExplicitAttributions(rawChunks);
    const sourceNames = Array.from(
      new Set(results.map((r) => r.filename).filter(Boolean))
    );

    return {
      context: cleaned,
      traceability: {
        usedFileSearch: rawChunks.length > 0,
        sourceNames
      },
      stats: {
        ...sanStats,
        rawLength: rawChunks.length,
        cleanedLength: cleaned.length,
        resultCount: results.length
      }
    };
  } catch (error) {
    // Fail-safe: no rompemos el chat si la search falla.
    console.warn(
      JSON.stringify({
        kind: 'chat_rag_search_failed',
        message: error instanceof Error ? error.message : 'unknown',
        timestamp: new Date().toISOString()
      })
    );
    return EMPTY_RESULT;
  }
}
