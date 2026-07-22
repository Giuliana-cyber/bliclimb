/**
 * Chat · #15 · Fase 4 UI · Batch 4.
 *
 * Nav 4 items · Chat activo (Giuliana 2026-07-21).
 * Reglas duras:
 *   - "Me duele algo" (o cualquier match de dolor) SIEMPRE abre /dolor.
 *     Nunca damos consejo médico en el chat.
 *   - Respuestas ancladas en el perfil real (v1 mock GC-001, Fase 4b
 *     lee de Supabase).
 *
 * v1: burbujas mock del coach + input + quick-replies. Fase 4b:
 * conectar con /api/chat que ya existe + guardrails server-side (B1
 * de la Fase 3).
 */

import { ChatView } from './ChatView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ChatPage() {
  return (
    <ChatView
      character="bill"
      profileSummary={{
        grado: 'V4-V6',
        sesionesPorSemana: 3,
        capitulo: 'Entrada controlada',
      }}
    />
  );
}
