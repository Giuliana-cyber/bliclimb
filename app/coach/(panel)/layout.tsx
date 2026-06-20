import { redirect } from 'next/navigation';
import { loadCoachContext } from '@/lib/coach/context';
import { CoachShell } from '@/components/coach/CoachShell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CoachPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const context = await loadCoachContext();
  if (!context) {
    // No es coach (o no está logueado) — lo mandamos a la página de upgrade,
    // que es pública.
    redirect('/coach/upgrade');
  }

  return <CoachShell context={context}>{children}</CoachShell>;
}
