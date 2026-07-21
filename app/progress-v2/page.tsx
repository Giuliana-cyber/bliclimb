/**
 * Progreso · Fase 4 UI · Batch 2 (F4-UI.6).
 *
 * v1 UI ahora, datos después (Giuliana 2026-07-21).
 * DoD: constancia primero · días de descanso cuentan · nunca X roja ·
 * el grado se celebra en retest, no aquí.
 *
 * Este server component hoy manda estado "primera-semana" con data mock
 * mínima. Cuando exista persistencia en Supabase (misma dependencia que
 * el backend de onboarding), pasa a leer sessions_log + checkins reales.
 *
 * TODO Fase 4b:
 *   - Leer session_events (completed_at, feeling, notes) de Supabase.
 *   - Contar streak, sesiones-esta-semana, capítulo actual.
 *   - Card "aquí va a vivir tu historia" solo hasta que haya ≥1 sesión.
 */

import { ProgressView, type ProgressSnapshot } from './ProgressView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Snapshot mock para el piloto GC-001 · primera semana con 2 sesiones
// completadas. Cambia a `firstTime: true` para ver el estado cálido de
// "aquí va a vivir tu historia".
const PILOT_SNAPSHOT: ProgressSnapshot = {
  firstTime: false,
  weekLabel: 'Esta semana',
  weekPath: [
    { label: 'Lun', state: 'done' },
    { label: 'Mar', state: 'rest' },
    { label: 'Mié', state: 'done' },
    { label: 'Hoy', state: 'today' },
    { label: 'Vie', state: 'rest' },
    { label: 'Sáb', state: 'upcoming' },
  ],
  streak: 3,
  sessionsThisWeek: 2,
  chapter: {
    title: 'Capítulo de Montaña',
    subtitle: 'Entrada controlada',
    sessionsDone: 2,
    sessionsTotal: 3,
  },
  moments: [
    {
      when: 'Ayer',
      label: 'Terminaste tu sesión de dedos suaves',
      feeling: 'bien',
    },
    {
      when: 'Hace 3 días',
      label: 'Cerraste tu primer bloque de movilidad',
      feeling: 'bien',
    },
  ],
};

export default function ProgressPage() {
  return <ProgressView character="bill" snapshot={PILOT_SNAPSHOT} />;
}
