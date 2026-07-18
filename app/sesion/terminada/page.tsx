/**
 * Sesión terminada · Fase 4 UI · Batch 1 · pantalla de celebración.
 *
 * Server component thin: por ahora hardcodea el achievement + streak.
 * TODO Fase 4b:
 *   - Contar sesiones completadas de la semana desde Supabase.
 *   - Elegir el achievement según reglas (constancia · dolor cero · etc).
 *   - Persistir el check-in (Bien / Cansancio / Algo me molestó).
 */

import { SesionTerminadaView } from './SesionTerminadaView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function SesionTerminadaPage() {
  return (
    <SesionTerminadaView
      character="bill"
      coachQuote="Tres ejercicios, cero dolor de dedos. Así se vuelve fuerte."
      achievement={{
        title: 'Constancia de Acero',
        subtitle: 'Llevas 3 sesiones esta semana. Vas parejo.',
      }}
      chapter={{
        title: 'Capítulo de Montaña',
        subtitle: 'Entrada controlada',
        days: [
          { label: 'Lun', state: 'done' },
          { label: 'Mié', state: 'done' },
          { label: 'Hoy', state: 'today' },
          { label: 'Sáb', state: 'upcoming' },
        ],
      }}
    />
  );
}
