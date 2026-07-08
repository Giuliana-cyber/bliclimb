// Disclaimer de lesión declarada — primer mensaje del coach en /chat.
//
// Producto (audit-360 · rediseño onboarding lesión):
//   - Cuando el usuario declara una lesión activa en el onboarding
//     (`injuries` incluye cualquier zona ≠ 'none' y ≠ 'returning'), el
//     motor SÍ genera el plan (adaptado por §1.3/§14.2), pero el coach
//     abre el chat con este mensaje reconociendo la lesión y sugiriendo
//     ver a un fisio.
//   - El copy es DETERMINÍSTICO. No pasa por LLM. Aprobado por Giuliana
//     turno del 07/07/2026.
//   - Voz Bill / Senda. Sin interpolación de zona (decisión de producto:
//     "un solo template, mensaje sin mención de zona").
//   - Se marca "acknowledged" en el momento en que el usuario envía su
//     primer mensaje real, o cierra el chat — no vuelve a aparecer hasta
//     que actualice `injuries` en /profile.
//
// Consumidores:
//   - components/ChatInterface.tsx: renderiza como primer mensaje asistente
//     si `shouldShowInjuryDisclaimer` retorna true.

const BILL_MESSAGE =
  'Vi que tienes una lesión. Adapté el plan para no cargarla, pero esto lo tiene que ver un profesional — un fisio te va a decir mejor que yo qué puedes y qué no. Si te indica algo distinto, hazle caso a él.';

const SENDA_MESSAGE =
  'Vi que tienes una lesión. Preparé el plan cuidando esa zona, pero esto lo tiene que ver un profesional — un fisio va a leer tu caso mejor que yo. Si te indica algo distinto, hazle caso.';

/** Devuelve el copy determinístico según el coach activo. */
export function getInjuryDisclaimer(character: 'bill' | 'senda'): string {
  return character === 'senda' ? SENDA_MESSAGE : BILL_MESSAGE;
}

/**
 * Zonas que sí gatillan el disclaimer. `none` y `returning` no cuentan:
 *   - 'none' = declaración explícita de "no tengo lesión".
 *   - 'returning' = "regresando de lesión" — señala historial pero no
 *     lesión activa. No disparamos el disclaimer para no ser insistentes
 *     con alguien que ya se recuperó.
 */
const INJURY_ZONES_TRIGGERING_DISCLAIMER = new Set([
  'fingers',
  'elbows',
  'shoulders',
  'back',
  'knees',
  'wrists',
  'other'
]);

export function hasActiveInjury(injuries: readonly string[] | null | undefined): boolean {
  if (!injuries) return false;
  return injuries.some((zone) => INJURY_ZONES_TRIGGERING_DISCLAIMER.has(zone));
}

/**
 * Determina si mostrar el disclaimer en el primer render del chat.
 * `acknowledgedAt` viene del profile (ISO date o null). Cuando no es null,
 * el disclaimer ya fue leído y no vuelve a aparecer hasta que el usuario
 * modifique sus lesiones desde /profile (esa modificación limpia el flag).
 */
export function shouldShowInjuryDisclaimer(
  injuries: readonly string[] | null | undefined,
  acknowledgedAt: string | null | undefined
): boolean {
  if (acknowledgedAt) return false;
  return hasActiveInjury(injuries);
}
