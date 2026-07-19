/**
 * Sesion · Fase 4 UI · Batch 1 · pantalla en curso.
 *
 * Server component que:
 *   1. Genera sesión con motor invertido (Fase 3) usando GC-001 hardcoded.
 *   2. Renderiza SesionView con la traducción del Stitch
 *      docs/design/carpeta_3/sesi_n_bilclimb (iteración más pulida).
 *
 * TODO Fase 4b: perfil desde Supabase auth, cache de sesión por (user_id, date).
 */

import { loadCatalog } from '@/lib/brain/motor-inverted/catalog-loader';
import { generateSession } from '@/lib/brain/motor-inverted/plan-generator';
import type { Profile } from '@/lib/brain/motor-inverted/types';
import { SesionView } from './SesionView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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

export default async function SesionPage() {
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
        sessionTheme: 'Movilidad y Dedos Suaves',
      },
    });
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Error inesperado';
  }

  return (
    <SesionView
      session={sessionData?.session ?? null}
      character={PILOT_PROFILE.character}
      currentIndex={0}
      restSeconds={91}
      error={errorMsg}
    />
  );
}
