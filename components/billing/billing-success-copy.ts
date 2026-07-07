// Copy de /billing/success — extraído del componente para que el test lo
// importe sin parsear el TSX (framer-motion + MountainBackdrop no son
// relevantes para validar textos).
//
// Los tres valores fueron aprobados por Giuliana antes del commit del
// Bloque 1 (audit-360). Cualquier cambio debe pasar por review de producto.

export type BillingSuccessCycle = 'monthly' | 'annual' | null;

export const BILLING_SUCCESS_COPY: Record<'monthly' | 'annual' | 'fallback', string> = {
  monthly:
    'Tienes 30 días de prueba gratuita. Después se cobran $29 MXN al mes. Se renueva automáticamente cada mes; puedes cancelar cuando quieras desde Ajustes.',
  annual:
    'Tienes 30 días de prueba gratuita. Después se cobran $249 MXN al año. Se renueva automáticamente cada año; puedes cancelar cuando quieras desde Ajustes.',
  fallback:
    'Tienes 30 días de prueba gratuita. Después se cobra tu plan según el ciclo que elegiste (mensual o anual). Se renueva automáticamente; puedes cancelar cuando quieras desde Ajustes.'
};

export function selectBillingSuccessDescription(
  billingCycle: BillingSuccessCycle
): string {
  if (billingCycle === 'monthly') return BILLING_SUCCESS_COPY.monthly;
  if (billingCycle === 'annual') return BILLING_SUCCESS_COPY.annual;
  return BILLING_SUCCESS_COPY.fallback;
}
