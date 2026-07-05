// Textos verbatim del Doc 02 v3, Sección 5 — Reglas de salud y derivación.
//
// Fuente: docs/brain/doc-02-reglas-seguridad-v3.md, §5.2, §5.3, §5.4.
//
// NOTA IMPORTANTE sobre tono user-facing:
// Los mensajes acá son los textos técnicos del Doc 02 (indican qué hace la
// regla). El tono Belay Partners para mostrarle al usuario final vive en
// un catálogo separado (17 mensajes ya listos) que se carga aparte al
// integrar con chat/generate-plan. NO hardcodear tono nuevo acá.

export const SECTION_05_MESSAGES = {
  // §5.2 — Historial de lesión de polea
  pulleyHistory: {
    text:
      'Si reporta lesión de polea pasada (aunque resuelta): nunca desbloquear ' +
      'full crimp ni regletas <15 mm sin validación profesional explícita.',
    source: 'Doc 02 §5.2'
  },
  // §5.3 — Historial de epicondilitis / dolor crónico de codo
  elbowHistory: {
    text:
      'Si reporta historial: priorizar trabajo de antebrazo antagonista ' +
      '(reverse wrist curls / extensores) ANTES de añadir volumen de tracción. ' +
      'Reducir frecuencia inicial de dominadas y lock-offs hasta haber ' +
      'completado 4 semanas de prevención de extensores sin síntomas.',
    source: 'Doc 02 §5.3'
  },
  // §5.4 — Sueño y recuperación
  poorSleep: {
    text:
      'Si <7h consistente: reducir intensidad programada automáticamente.',
    source: 'Doc 02 §5.4'
  }
} as const;
