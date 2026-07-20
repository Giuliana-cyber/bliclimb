/**
 * Sesion · Fase 4 UI · pantalla en curso · mini-test end-to-end.
 *
 * Server component que ensambla una sesión COMPUESTA con 3 slices:
 *   1. calentamiento (2 EX · pool de las 30 curadas 2026-07-20)
 *   2. fuerza-dedos (3 EX · pool curado 2026-07-19)
 *   3. recuperacion  (2 EX · pool de las 30 curadas 2026-07-20)
 *
 * Perfil = GC-001 (Giuliana condición baja / reconstrucción):
 *   hang 5s · 3 pullups · sin dolor · sin lesión · maxRiskLevel=medium.
 *
 * TODO Fase 4b: perfil desde Supabase auth, cache de sesión por
 * (user_id, date), y `generateFullSession()` en plan-generator que
 * orqueste warmup+main+cooldown en una call en vez de 3 aquí.
 */

import { loadCatalog } from '@/lib/brain/motor-inverted/catalog-loader';
import { generateSession } from '@/lib/brain/motor-inverted/plan-generator';
import type { Profile } from '@/lib/brain/motor-inverted/types';
import type { AssembledSession } from '@/lib/brain/motor-inverted/assembler';
import { SesionView } from './SesionView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 3 slices × ~8s cada una = ~24s. Con margen para latencia OpenAI.
export const maxDuration = 60;

// Perfil GC-001 · condición baja / reconstrucción.
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

const SLICES = [
  { category: 'calentamiento', nExercises: 2, theme: 'Preparación' },
  { category: 'fuerza-dedos', nExercises: 3, theme: 'Trabajo principal' },
  { category: 'recuperacion', nExercises: 2, theme: 'Cierre y cuidado' },
] as const;

export default async function SesionPage() {
  const catalog = loadCatalog();

  let combined: AssembledSession | null = null;
  let focusRule: string | null = null;
  let errorMsg: string | null = null;

  try {
    // 3 slices en paralelo · el focus se deriva una sola vez (GC-001
    // → reconstrucción · maxRiskLevel=medium). Cada slice pide su
    // categoría al mismo pool restringido.
    const results = await Promise.all(
      SLICES.map((s) =>
        generateSession({
          catalog,
          profile: PILOT_PROFILE,
          options: {
            category: s.category,
            nExercises: s.nExercises,
            sessionTheme: s.theme,
          },
        }),
      ),
    );

    // Concatenamos los exercises en el orden calentamiento → dedos →
    // recuperación. El "rationale" agarra el de dedos (el bloque
    // principal). El focus también de dedos (todos los slices comparten
    // el mismo focus derivado).
    const [warmup, main, cooldown] = results;
    focusRule = main.meta.focusRule ?? null;
    combined = {
      title: 'Reconstrucción · Dedos Suaves',
      rationale: main.session.rationale,
      focus: main.session.focus,
      atleta: main.session.atleta,
      exercises: [
        ...warmup.session.exercises,
        ...main.session.exercises,
        ...cooldown.session.exercises,
      ],
      pool: {
        eligibleCount:
          warmup.meta.eligibleCount +
          main.meta.eligibleCount +
          cooldown.meta.eligibleCount,
        blockedCount:
          warmup.meta.blockedCount +
          main.meta.blockedCount +
          cooldown.meta.blockedCount,
        activatedGates: [],
      },
    };
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Error inesperado';
  }

  return (
    <SesionView
      session={combined}
      character={PILOT_PROFILE.character}
      currentIndex={0}
      restSeconds={91}
      error={errorMsg}
      focusRule={focusRule}
    />
  );
}
