// Helper que emite una respuesta fija por SSE con el mismo shape que la
// respuesta streamed de Bill (`event: delta` con `{ text }` + `event: done`).
//
// Usado por chat/route.ts cuando §3.15 dispara: en vez de llamar a
// OpenAI, streameamos el mensaje de derivación como si fuera una
// respuesta más de Bill. El frontend no distingue el origen.

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Construye un `ReadableStream<Uint8Array>` que emite `event: delta`
 * con el texto completo del mensaje + `event: done` con `donePayload`
 * (default `{}` — Bill emite metadata de trazabilidad de fuentes acá).
 *
 * Cierra el stream inmediatamente después. Latencia despreciable.
 */
export function buildFixedResponseStream(
  message: string,
  donePayload: Record<string, unknown> = {}
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(sse('delta', { text: message }));
        controller.enqueue(sse('done', donePayload));
      } finally {
        controller.close();
      }
    }
  });
}
