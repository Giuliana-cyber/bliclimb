// TODO(legacy-mp): remove after Stripe validated.
// Alias histórico. SubscribeCard hoy llama directo a
// /api/billing/create-checkout-session (Stripe). Mantenemos este re-export
// para cualquier integración externa que aún apunte al nombre viejo.

export { POST } from '../create-checkout-session/route';

export const runtime = 'nodejs';
