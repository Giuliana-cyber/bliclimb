// Mensaje de derivación para §3.15 — pérdida de peso.
//
// Este mensaje se muestra al usuario cuando la orchestrator confirma
// intención de cambio de peso (capa 1 detecta topic + capa 2 clasifica
// como 'change-weight').
//
// TODO — TABLA EDITABLE:
// El texto de tono Belay Partners va a mudarse a una tabla editable
// en Supabase para que se pueda ajustar sin redeploy. Cuando esa tabla
// exista, `getDerivationMessage(ruleId)` la consulta y este archivo
// queda solo con el fallback estático.
//
// Placeholder actual (fragmento de mensajes-tono-belay-partners.md §3.15):
// pendiente el texto completo. Si Giuliana pasa el archivo, reemplazar
// el string de abajo verbatim.

export const SECTION_03_15_DERIVATION_MESSAGE = `Querer escalar más duro es exactamente la meta correcta, y entiendo que en escalada aparece la idea de que "menos peso = más grado". Pero Bill no arma planes de pérdida de peso — y no es por diplomacia, es porque hacerlo mal tiene un costo alto y muy documentado (RED-S, fracturas por estrés, alteración del ciclo menstrual, pérdida de fuerza a mediano plazo). La evidencia de que bajar peso mejore rendimiento en escalada élite es conflictiva, y el margen para hacerlo bien es estrecho.

Lo que sí puedo hacer: armarte un plan de entrenamiento fuerte con lo que hoy tenés. Si querés explorar el tema peso/composición corporal, el paso correcto es un nutricionista deportivo con experiencia en deportes de fuerza-resistencia — no un chatbot ni un plan genérico de internet.`;

/**
 * Devuelve el texto del mensaje de derivación para la regla dada.
 *
 * Cuando la tabla editable en Supabase esté, esta función va a hacer
 * un query y cachear con TTL. Por ahora es sync y retorna el placeholder.
 */
export function getDerivationMessage(ruleId: '3.15'): string {
  if (ruleId === '3.15') return SECTION_03_15_DERIVATION_MESSAGE;
  // TS asegura exhaustividad; nunca llegamos acá.
  throw new Error(`getDerivationMessage: ruleId no soportado: ${ruleId as string}`);
}
