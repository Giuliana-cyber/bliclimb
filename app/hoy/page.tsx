/**
 * Hoy · Fase 4 UI · pantalla principal · P0 backend integrado.
 *
 * Server component que:
 *   1. Requiere sesión Supabase autenticada · sin sesión → /sign-in
 *   2. Requiere onboarding completado · sin onboarded_at → /onboarding-v2
 *   3. Deriva focus + genera sesión con motor invertido usando el
 *      profile real del user.
 *   4. Renderiza HoyView.
 *
 * TODO F4-UI.4: cache por (user_id, date) en sessions_cache · evita
 * regenerar y pagar LLM en cada visita del mismo día.
 */

import { redirect } from 'next/navigation';
import { loadCatalog } from '@/lib/brain/motor-inverted/catalog-loader';
import { generateSession } from '@/lib/brain/motor-inverted/plan-generator';
import { createClient } from '@/lib/supabase/server';
import {
  getServerProfileV2,
  profileRowToMotorProfile,
} from '@/lib/db/onboarding-v2';
import { HoyView } from './HoyView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export default async function HoyPage() {
  const supabase = createClient();
  const { userId, profile, isOnboarded } = await getServerProfileV2(supabase);

  // Auth gate · sin sesión → sign-in
  if (!userId) {
    redirect('/sign-in?next=/hoy');
  }

  // Onboarding gate · sin flow completado → onboarding-v2
  if (!isOnboarded || !profile) {
    redirect('/onboarding-v2');
  }

  const motorProfile = profileRowToMotorProfile(profile);
  const catalog = loadCatalog();

  let sessionData: Awaited<ReturnType<typeof generateSession>> | null = null;
  let errorMsg: string | null = null;

  try {
    sessionData = await generateSession({
      catalog,
      profile: motorProfile,
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
