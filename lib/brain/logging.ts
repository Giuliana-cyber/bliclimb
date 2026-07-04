// Logging del middleware de seguridad.
//
// La interface LogSink permite swap trivial a SupabaseLogSink cuando llegue
// la sub-fase de audit persistente. Sub-fase 1 usa ConsoleLogSink por default.

import type { BlockLogEvent, LogSink } from './types';

/**
 * Log estructurado a stdout. Formato JSON de una línea para que Vercel /
 * cualquier log aggregator lo parsee. Prefijo `[safety]` para grep.
 */
export class ConsoleLogSink implements LogSink {
  logBlock(event: BlockLogEvent): void {
    // eslint-disable-next-line no-console
    console.log(`[safety] ${JSON.stringify({ event: 'block', ...event })}`);
  }
}

/**
 * Sink mudo para tests. No emite nada.
 */
export class NullLogSink implements LogSink {
  logBlock(_event: BlockLogEvent): void {
    // intencionalmente vacío
  }
}
