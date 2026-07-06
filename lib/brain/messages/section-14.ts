// Textos de Sección 14 del Doc 02 v3 — Prevención específica.
//
// Sub-fase 5 grupo 1 arranca por §14.2 (extensores). Los otros §14.x
// (14.1 fin de ciclo → mantenimiento; 14.3 contador móvil; 14.4 timer
// tiempo real) requieren data que Bill aún no captura por defecto
// (ver notas de "Reglas de v3" al final del Doc 02).

export const SECTION_14_RULE_SUMMARIES: Record<string, { text: string; source: string }> = {
  '14.2': {
    text:
      'Prevención de epicondilitis: si el plan tiene 3+ días/semana de ' +
      'tracción (escalada, hangboard, dominadas), debe incluir trabajo de ' +
      'extensores. Con historial de epicondilitis es OBLIGATORIO en TODA ' +
      'semana con al menos una sesión de tracción — regla dura.',
    source: 'Doc 02 §14.2 (Belay Partners); Lattice — extensor loading protocols'
  }
} as const;
