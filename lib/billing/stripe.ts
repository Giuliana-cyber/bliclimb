import Stripe from 'stripe';

const DEFAULT_ANNUAL_PRICE_ID = 'price_1TjA6IBfS6NSxetgqzfZsoWm';

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

export type BillingCycle = 'monthly' | 'annual';

/**
 * Price ID por ciclo. Soporta tanto el nombre nuevo (`STRIPE_ANNUAL_PRICE_ID`)
 * como el legacy `STRIPE_PRICE_ID` para no romper deploys actuales.
 *
 * Annual: $249 MXN/año + 30 días trial (configurado en el Price).
 * Monthly: $29 MXN/mes + 30 días trial.
 */
export function getStripePriceId(cycle: BillingCycle = 'annual'): string {
  if (cycle === 'monthly') {
    const monthly = process.env.STRIPE_MONTHLY_PRICE_ID?.trim();
    if (!monthly) {
      throw new Error(
        'STRIPE_MONTHLY_PRICE_ID no está configurado. Setea la env var para habilitar plan mensual.'
      );
    }
    return monthly;
  }
  return (
    process.env.STRIPE_ANNUAL_PRICE_ID?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim() ||
    DEFAULT_ANNUAL_PRICE_ID
  );
}

/**
 * Etiqueta de precio user-facing por ciclo.
 */
export function getPriceLabel(cycle: BillingCycle): string {
  return cycle === 'monthly' ? '$29 MXN/mes' : '$249 MXN/año';
}

// ---------- Coach tiers ----------

export type CoachTier = 'starter' | 'pro' | 'gym';

/**
 * Price ID por tier de coach. Las env vars se configuran en Vercel una vez
 * que los productos están creados en Stripe Dashboard.
 */
export function getStripeCoachPriceId(tier: CoachTier): string {
  const envVar =
    tier === 'starter'
      ? 'STRIPE_COACH_STARTER_PRICE_ID'
      : tier === 'pro'
      ? 'STRIPE_COACH_PRO_PRICE_ID'
      : 'STRIPE_COACH_GYM_PRICE_ID';
  const value = process.env[envVar]?.trim();
  if (!value) {
    throw new Error(`${envVar} no está configurado.`);
  }
  return value;
}

/**
 * Resuelve tier dado un price_id. Devuelve `null` si el price_id no
 * corresponde a un tier de coach (es atleta o desconocido). El webhook usa
 * esto para decidir si actualizar `profiles.role` + `entitlements.coach_tier`.
 */
export function coachTierFromPriceId(priceId: string | null | undefined): CoachTier | null {
  if (!priceId) return null;
  const starter = process.env.STRIPE_COACH_STARTER_PRICE_ID?.trim();
  const pro = process.env.STRIPE_COACH_PRO_PRICE_ID?.trim();
  const gym = process.env.STRIPE_COACH_GYM_PRICE_ID?.trim();
  if (starter && priceId === starter) return 'starter';
  if (pro && priceId === pro) return 'pro';
  if (gym && priceId === gym) return 'gym';
  return null;
}

export function getCoachTierLabel(tier: CoachTier): string {
  switch (tier) {
    case 'starter':
      return 'Starter — $199 MXN/mes · hasta 5 clientes';
    case 'pro':
      return 'Pro — $499 MXN/mes · hasta 15 clientes';
    case 'gym':
      return 'Gym — $999 MXN/mes · clientes ilimitados';
  }
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
