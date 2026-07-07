// Mensajes de la regla §1.gating (plan-level enforcement de section-01).
//
// Esta regla NO tiene mensaje user-facing propio — cuando dispara, el
// orquestador la trata igual que cualquier blocking violation: dispara
// regeneración. Tras N retries fallidos, muestra el fallback #17 (mismo
// mecanismo que §3.x).
//
// El `text` de acá es interno (log + prompt de retry) y explica al modelo
// por qué el ejercicio fue rechazado.

export const SECTION_01_PLAN_GATING_SUMMARY = {
  text:
    'Categoría gateable (§1.1 menores / §1.2 <2 años práctica): el LLM ' +
    'incluyó un ejercicio de una categoría que el perfil bloquea por ' +
    'seguridad. Regla dura del Doc 02 §1.x — regenerar la semana ' +
    'eliminando la categoría prohibida.',
  source: 'Doc 02 §1.1, §1.2 (BlockedCategory match)'
} as const;
