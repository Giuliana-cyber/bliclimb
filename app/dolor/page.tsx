/**
 * Dolor · #16 · Fase 4 UI · Batch 4 (F4-UI.7).
 *
 * Bottom-sheet full-screen para reportar dolor · sin nav inferior.
 * Zona (chips multi-select) + intensidad slider 0-10 con semáforo cálido.
 * 2 acciones:
 *   - "Ajustamos la sesión" → re-gatea restrict-pool por zona (v1 mock)
 *   - "Mejor descansa hoy" → sin culpa · anota rest_day
 * Si intensidad ≥ 7 → puente a /dolor/derivacion (#17).
 *
 * Regla dura Giuliana 2026-07-21: la ruta de dolor SIEMPRE termina en
 * ajustar / descansar / derivar. Nunca queda en un limbo.
 *
 * TODO Fase 4b: POST /api/dolor con {zona[], intensidad, feeling} →
 * escribe session_events (Supabase). Motor de la próxima sesión lo lee
 * y ajusta focus + restrict-pool.
 */

import { DolorView } from './DolorView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function DolorPage() {
  return <DolorView character="bill" />;
}
