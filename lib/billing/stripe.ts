import Stripe from 'stripe';

const DEFAULT_PRICE_ID = 'price_1TjA6IBfS6NSxetgqzfZsoWm';

/**
 * Cliente Stripe singleton. Lo creamos lazy para no crashear módulos en
 * builds donde la env var aún no esté seteada (preview en Vercel, tests).
 *
 * Importante: no fijamos `apiVersion` manualmente. El SDK instalado define la
 * versión activa y mantiene los tipos consistentes con esa versión. Pinearla
 * a un string específico provoca desincronizaciones de tipos cada vez que
 * actualizamos `stripe` y obliga a un `as Stripe.LatestApiVersion`.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      'STRIPE_SECRET_KEY no está configurado. Setea la env var antes de cobrar.'
    );
  }
  cached = new Stripe(secret, { typescript: true });
  return cached;
}

/**
 * Price ID del plan anual ($249 MXN / año + 30 días de trial).
 * Configurable por env var para poder rotar precios sin redeploy.
 */
export function getStripePriceId(): string {
  return process.env.STRIPE_PRICE_ID?.trim() || DEFAULT_PRICE_ID;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET no está configurado. Sin él no podemos validar webhooks.'
    );
  }
  return secret;
}

/**
 * Public key — solo se expone para inicializar Stripe.js en el cliente si
 * llegamos a usarla (Checkout redirige por URL, así que probablemente no la
 * necesitemos, pero la dejamos lista).
 */
export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null;
}
