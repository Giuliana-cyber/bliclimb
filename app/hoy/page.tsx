/**
 * Hoy · Fase 4 UI piloto #2.
 *
 * Server component que:
 *   1. Deriva focus + genera sesión con motor invertido (Fase 3).
 *   2. Renderiza `HoyView` (client) con el diseño Stitch de
 *      docs/design/carpeta_3/hoy_bilclimb_1/code.html.
 *
 * Perfil: GC-001 Giuliana hardcoded para el piloto. Fase 4b conecta
 * con Supabase auth + perfil real del usuario.
 *
 * Costo por render: ~$0.0005 con gpt-4o-mini (~1000-2500 tokens).
 * TODO Fase 4c: cache por (user_id, date) en Supabase para reusar la
 * sesión del día. Por ahora se regenera cada request.
 */

import { loadCatalog } from '@/lib/brain/motor-inverted/catalog-loader';
import { generateSession } from '@/lib/brain/motor-inverted/plan-generator';
import type { Profile } from '@/lib/brain/motor-inverted/types';
import { HoyView } from './HoyView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// El motor puede tardar 5-8s con gpt-4o-mini. Vercel Pro permite 60s.
export const maxDuration = 60;

// Perfil GC-001 hardcoded · Fase 4b lo trae de Supabase auth.
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

export default async function HoyPage() {
  const catalog = loadCatalog();

  let sessionData: Awaited<ReturnType<typeof generateSession>> | null = null;
  let errorMsg: string | null = null;

  try {
    sessionData = await generateSession({
      catalog,
      profile: PILOT_PROFILE,
      options: {
        category: 'fuerza-dedos',
        nExercises: 4,
        sessionTheme: 'Reconstrucción · dedos asistidos + hombros técnicos',
      },
    });
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Error inesperado';
  }

  return (
    <HoyView
      session={sessionData?.session ?? null}
      focusRule={sessionData?.meta.focusRule ?? null}
      streak={3}
      weekPath={[
        { label: 'Lun', state: 'completed' },
        { label: 'Hoy', state: 'today' },
        { label: 'Jue', state: 'upcoming' },
        { label: 'Sáb', state: 'upcoming' },
      ]}
      error={errorMsg}
    />
  );
}
