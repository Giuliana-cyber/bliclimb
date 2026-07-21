/**
 * Plan · Fase 4 UI · Batch 2 (F4-UI.6).
 *
 * v1 simple: semana como capítulo · orden sugerido · "tú eliges cuándo"
 * (Giuliana 2026-07-21). Consume el motor invertido: para el piloto GC-001
 * derivamos el focus + narrativa y armamos 3 sesiones sugeridas de la
 * semana con títulos coherentes con la fase de reconstrucción.
 *
 * v1 no arrastra sesiones a días específicos (fast-follow). Solo:
 *   - Capítulo actual
 *   - 3 sesiones sugeridas · una completada, una actual, una pendiente
 *   - CTA "Empezar" en la actual → /sesion
 *
 * TODO Fase 4b: state real de completed sessions desde Supabase,
 * re-generar plan cuando el user termina la actual.
 */

import { loadCatalog } from '@/lib/brain/motor-inverted/catalog-loader';
import { deriveFocus } from '@/lib/brain/motor-inverted/focus-selector';
import type { Profile } from '@/lib/brain/motor-inverted/types';
import { PlanView, type PlannedSession } from './PlanView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PILOT_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 5,
  maxPullupReps: 3,
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'hangboard', 'home', 'bands', 'weights', 'pullup_bar'],
  character: 'bill',
};

export default async function PlanPage() {
  const catalog = loadCatalog();
  const { focus } = deriveFocus(catalog, PILOT_PROFILE);

  // v1 mock del plan · 3 sesiones sugeridas coherentes con el focus.
  // Fase 4b: derivar títulos y estados desde Supabase.
  const sessions: PlannedSession[] = [
    {
      id: 's1',
      index: 1,
      title: 'Movilidad y dedos suaves',
      focusLabel: 'Base técnica',
      durationMin: 25,
      state: 'completed',
    },
    {
      id: 's2',
      index: 2,
      title: 'Dedos asistidos y hombros técnicos',
      focusLabel: 'Reconstrucción de agarre',
      durationMin: 30,
      state: 'current',
    },
    {
      id: 's3',
      index: 3,
      title: 'Fuerza suave y cierre',
      focusLabel: 'Consolidación',
      durationMin: 25,
      state: 'upcoming',
    },
  ];

  return (
    <PlanView
      character={PILOT_PROFILE.character}
      chapter={{
        title: 'Capítulo de Montaña',
        subtitle: 'Entrada controlada',
        narrative:
          focus.narrative ??
          'Reconstruimos desde donde estás — sin apuro, sin castigo.',
      }}
      sessions={sessions}
    />
  );
}
