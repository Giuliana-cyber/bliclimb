/**
 * Derivación · #17 · Fase 4 UI · Batch 4.
 *
 * Pantalla de fail-closed CON CARA HUMANA (Giuliana 2026-07-21).
 * Se llega desde #16 cuando intensidad ≥ 7. Sin nav inferior.
 * Encuadre: "no diagnostico ni trato" · cards de "qué SÍ podemos hacer".
 *
 * v1 alternativas mock: recuperación física + movilidad + mental (los 3
 * pilares seguros que el motor invertido siempre puede prescribir).
 * Fase 4b: leer alternativas reales via restrict-pool con
 * maxRiskLevel='low' + filtro por zona lesionada.
 */

import { DerivacionView } from './DerivacionView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function DerivacionPage({
  searchParams,
}: {
  searchParams: Promise<{ zonas?: string; intensidad?: string }>;
}) {
  const params = await searchParams;
  const zonas = (params.zonas ?? '').split(',').filter(Boolean);
  const intensidad = Number(params.intensidad ?? 8);

  // v1 · alternativas siempre seguras (los 3 pilares low-risk).
  // Fase 4b: filtrar dinámicamente por zona con restrict-pool.
  const alternativas = [
    {
      id: 'a1',
      title: 'Movilidad suave general',
      copy: 'Rangos cortos, sin peso. Solo despertar el cuerpo.',
      icon: 'accessibility_new',
    },
    {
      id: 'a2',
      title: 'Respiración y relajación',
      copy: '10 minutos para bajar el sistema nervioso.',
      icon: 'self_improvement',
    },
    {
      id: 'a3',
      title: 'Sesión de cuidado',
      copy: 'Cuidado de piel + hidratación + registro. Nada de carga.',
      icon: 'favorite',
    },
  ];

  return (
    <DerivacionView
      character="bill"
      zonas={zonas}
      intensidad={intensidad}
      alternativas={alternativas}
    />
  );
}
