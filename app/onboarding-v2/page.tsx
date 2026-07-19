/**
 * Onboarding v2 · Fase 4 UI · Batch 2 · entry point.
 *
 * Server component thin: solo monta el flow client-side.
 * Cuando F4-UI backend conecte auth, este page pre-carga el perfil
 * existente (si el user ya arrancó el onboarding) y lo pasa al flow.
 */

import { OnboardingFlow } from './OnboardingFlow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function OnboardingV2Page() {
  return <OnboardingFlow />;
}
