import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type EntitlementStatus = 'active' | 'paused' | 'cancelled' | 'past_due' | 'pending';

export type Entitlement = {
  profile_id: string;
  free_plan_used_at: string | null;
  provider: 'mercado_pago' | 'stripe' | null;
  provider_subscription_id: string | null;
  payer_email: string | null;
  status: EntitlementStatus | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
};

type RawRow = {
  profile_id: string;
  free_plan_used_at: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  payer_email: string | null;
  status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToEntitlement(row: RawRow): Entitlement {
  return {
    profile_id: row.profile_id,
    free_plan_used_at: row.free_plan_used_at,
    provider:
      row.provider === 'mercado_pago' || row.provider === 'stripe' ? row.provider : null,
    provider_subscription_id: row.provider_subscription_id,
    payer_email: row.payer_email,
    status: isStatus(row.status) ? row.status : null,
    current_period_end: row.current_period_end,
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    stripe_price_id: row.stripe_price_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function isStatus(value: unknown): value is EntitlementStatus {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'cancelled' ||
    value === 'past_due' ||
    value === 'pending'
  );
}

/**
 * Cliente admin compartido para operaciones server-side.
 * `EntitlementsClient` se expone para inyección en tests.
 */
export type EntitlementsClient = SupabaseClient;

function defaultClient(): EntitlementsClient {
  return createAdminClient();
}

/**
 * Devuelve la fila de entitlements del usuario. Si no existe, la crea vacía.
 * Idempotente con `upsert` por `profile_id`.
 */
export async function getEntitlement(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement> {
  const { data, error } = await client
    .from('entitlements')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`getEntitlement failed: ${error.message}`);
  }

  if (data) {
    return rowToEntitlement(data as RawRow);
  }

  // No existe — la creamos vacía.
  const { data: inserted, error: insertError } = await client
    .from('entitlements')
    .insert({ profile_id: userId })
    .select('*')
    .single();

  if (insertError) {
    // Race: otro request la pudo haber creado entre el SELECT y el INSERT.
    // Re-leemos antes de claudicar.
    const { data: retry, error: retryError } = await client
      .from('entitlements')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle();
    if (retryError || !retry) {
      throw new Error(`getEntitlement insert failed: ${insertError.message}`);
    }
    return rowToEntitlement(retry as RawRow);
  }

  return rowToEntitlement(inserted as RawRow);
}

/**
 * Marca el plan gratis como usado. Idempotente — si ya tenía timestamp, no lo toca.
 */
export async function markFreePlanUsed(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement> {
  await getEntitlement(userId, client);

  const { data, error } = await client
    .from('entitlements')
    .update({ free_plan_used_at: new Date().toISOString() })
    .eq('profile_id', userId)
    .is('free_plan_used_at', null)
    .select('*');

  if (error) {
    throw new Error(`markFreePlanUsed failed: ${error.message}`);
  }

  // Si la update no afectó ninguna fila (porque free_plan_used_at ya estaba seteado),
  // devolvemos la fila actual sin reescribir el timestamp.
  if (!data || data.length === 0) {
    return getEntitlement(userId, client);
  }

  return rowToEntitlement(data[0] as RawRow);
}

/**
 * true si el usuario tiene suscripción activa con período vigente.
 *
 * Reglas:
 * - `status === 'active'` AND `current_period_end > now()`. Incluye Stripe
 *   `trialing` porque mapStripeStatus colapsa trialing → 'active' al persistir
 *   (durante el trial de 30 días `current_period_end` es la fecha de fin del
 *   trial; al cobrarse la primera factura Stripe avanza el período un año).
 * - 'cancelled' con `current_period_end > now()` también cuenta como activo
 *   (cancelado pero todavía dentro del período pagado).
 */
export async function hasActiveSubscription(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const entitlement = await getEntitlement(userId, client);

  if (!entitlement.current_period_end) return false;
  const periodEnd = new Date(entitlement.current_period_end).getTime();
  if (Number.isNaN(periodEnd) || periodEnd <= Date.now()) return false;

  return entitlement.status === 'active' || entitlement.status === 'cancelled';
}

/**
 * true si el usuario aún no usó su plan gratis.
 */
export async function canGenerateFreePlan(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const entitlement = await getEntitlement(userId, client);
  return entitlement.free_plan_used_at === null;
}

/**
 * Duración del mes gratis tras generar el primer plan (en ms).
 * Expuesto como constante para que la UI lo use al calcular la fecha de fin.
 */
export const FREE_PLAN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Devuelve la fecha en la que termina el mes gratis del usuario, o `null` si
 * no aplica (nunca generó plan o ya tiene suscripción activa).
 *
 * Mientras la generación del plan no persista `created_at` en Supabase usamos
 * `free_plan_used_at + 30 días` como proxy (que es exactamente el momento en
 * que la generación del primer plan terminó OK).
 */
export function freePlanExpiresAt(entitlement: Entitlement): Date | null {
  if (!entitlement.free_plan_used_at) return null;
  const used = new Date(entitlement.free_plan_used_at).getTime();
  if (!Number.isFinite(used)) return null;
  return new Date(used + FREE_PLAN_WINDOW_MS);
}

/**
 * true si el usuario está dentro de la ventana de mes gratis (ya generó el
 * primer plan pero no han pasado 30 días).
 */
export async function isWithinFreePlanWindow(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const entitlement = await getEntitlement(userId, client);
  const expiresAt = freePlanExpiresAt(entitlement);
  if (!expiresAt) return false;
  return expiresAt.getTime() > Date.now();
}

/**
 * true si el atleta tiene asignado un coach con `status='accepted'` Y ese
 * coach tiene una suscripción de coach vigente (coach_tier no nulo,
 * status active/cancelled-en-período, current_period_end > now).
 *
 * Cuando esto es true el cliente entra a la app sin paywall: el coach
 * ya paga por él. Si el coach se da de baja, el cliente vuelve al gate
 * normal (sub propia o plan gratis).
 */
export async function hasActiveCoachAssignment(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const { data: rel, error: relErr } = await client
    .from('coach_clients')
    .select('coach_id')
    .eq('client_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (relErr) {
    throw new Error(`hasActiveCoachAssignment rel failed: ${relErr.message}`);
  }
  if (!rel) return false;
  const coachId = (rel as { coach_id: string }).coach_id;

  const { data: ent, error: entErr } = await client
    .from('entitlements')
    .select('coach_tier, status, current_period_end')
    .eq('profile_id', coachId)
    .maybeSingle();
  if (entErr) {
    throw new Error(`hasActiveCoachAssignment ent failed: ${entErr.message}`);
  }
  if (!ent) return false;

  const row = ent as {
    coach_tier: string | null;
    status: string | null;
    current_period_end: string | null;
  };
  if (!row.coach_tier) return false;
  // 'cancelled' con período vigente todavía cuenta — el coach pagó por este
  // ciclo aunque haya cancelado renovación.
  if (row.status !== 'active' && row.status !== 'cancelled') return false;
  if (!row.current_period_end) return false;
  const periodEnd = Date.parse(row.current_period_end);
  if (!Number.isFinite(periodEnd) || periodEnd <= Date.now()) return false;
  return true;
}

/**
 * true si el usuario puede usar features que dependen de tener un plan
 * "vivo" (chat, sesión, check-ins). Devuelve true cuando:
 *   - tiene suscripción activa O cancelada con período vigente, O
 *   - está dentro de la ventana de mes gratis (post-primer-plan), O
 *   - tiene un coach asignado con suscripción de coach vigente.
 *
 * Nota: si el usuario nunca generó un plan, esta función devuelve false —
 * el chat no debería ser usable sin contexto de plan.
 */
export async function hasActivePlanAccess(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const [activeSub, withinFreeWindow, coachedAccess] = await Promise.all([
    hasActiveSubscription(userId, client),
    isWithinFreePlanWindow(userId, client),
    hasActiveCoachAssignment(userId, client)
  ]);
  return activeSub || withinFreeWindow || coachedAccess;
}

// ---------- Helpers para B3 (webhook) ----------

/**
 * Upsert que escribe el resultado de un evento de Mercado Pago.
 * Se llama desde el webhook tras validar firma + idempotencia.
 */
export async function upsertEntitlementFromWebhook(
  payload: {
    profile_id: string;
    provider_subscription_id: string;
    payer_email?: string | null;
    status: EntitlementStatus;
    current_period_end: string | null;
  },
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement> {
  await getEntitlement(payload.profile_id, client);

  const { data, error } = await client
    .from('entitlements')
    .update({
      provider: 'mercado_pago',
      provider_subscription_id: payload.provider_subscription_id,
      payer_email: payload.payer_email ?? null,
      status: payload.status,
      current_period_end: payload.current_period_end
    })
    .eq('profile_id', payload.profile_id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`upsertEntitlementFromWebhook failed: ${error.message}`);
  }

  return rowToEntitlement(data as RawRow);
}

/**
 * Look-up por (provider, provider_subscription_id) — útil cuando MP nos manda
 * un evento sin external_reference y solo tenemos el ID de la suscripción.
 */
export async function findEntitlementBySubscriptionId(
  providerSubscriptionId: string,
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement | null> {
  const { data, error } = await client
    .from('entitlements')
    .select('*')
    .eq('provider', 'mercado_pago')
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(`findEntitlementBySubscriptionId failed: ${error.message}`);
  }
  return data ? rowToEntitlement(data as RawRow) : null;
}

// ---------- Helpers Stripe ----------

/**
 * Tipos mínimos del subset de Stripe que consumimos. No importamos
 * `Stripe.Subscription` directo para que los tests no necesiten el SDK.
 */
export type StripeSubscriptionLike = {
  id: string;
  status: string;
  current_period_end?: number | null;
  trial_end?: number | null;
  cancel_at_period_end?: boolean | null;
  customer: string | { id: string };
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
    }>;
  };
};

/**
 * Mapea el `status` de Stripe al enum interno de entitlements.
 *
 * `trialing` y `active` ambos cuentan como acceso vigente para nuestros gates.
 * Stripe envía `trialing` durante los 30 días de prueba; al cobrar la primera
 * factura el status pasa a `active` automáticamente sin que necesitemos hacer
 * nada en nuestro lado.
 */
export function mapStripeStatus(status: string): EntitlementStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
      return 'pending';
    default:
      return null;
  }
}

function unixSecondsToIso(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function extractCustomerId(
  customer: StripeSubscriptionLike['customer']
): string | null {
  if (typeof customer === 'string') return customer;
  if (customer && typeof customer === 'object' && 'id' in customer) {
    return customer.id;
  }
  return null;
}

function extractPriceId(subscription: StripeSubscriptionLike): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

/**
 * Guarda o actualiza el `stripe_customer_id` para un usuario. Idempotente:
 * llamarla dos veces con el mismo id no cambia nada.
 */
export async function upsertStripeCustomer(
  userId: string,
  stripeCustomerId: string,
  client: EntitlementsClient = defaultClient()
): Promise<void> {
  await getEntitlement(userId, client);
  const { error } = await client
    .from('entitlements')
    .update({
      provider: 'stripe',
      stripe_customer_id: stripeCustomerId
    })
    .eq('profile_id', userId);
  if (error) {
    throw new Error(`upsertStripeCustomer failed: ${error.message}`);
  }
}

/**
 * Aplica un evento de suscripción de Stripe al row del usuario. Reescribe
 * status, subscription_id, price_id y current_period_end. Idempotente:
 * llamarla con el mismo evento es seguro.
 *
 * - `userId` viene del `metadata.supabase_user_id` que setea el checkout
 *   endpoint, o del lookup por `stripe_customer_id` si la metadata se perdió.
 */
export async function upsertFromStripeSubscription(
  userId: string,
  subscription: StripeSubscriptionLike,
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement> {
  await getEntitlement(userId, client);

  const status = mapStripeStatus(subscription.status);
  if (!status) {
    throw new Error(
      `upsertFromStripeSubscription: status no mapeable "${subscription.status}"`
    );
  }

  const customerId = extractCustomerId(subscription.customer);
  const priceId = extractPriceId(subscription);
  const periodEnd = unixSecondsToIso(subscription.current_period_end ?? null);

  const updatePayload: Record<string, unknown> = {
    provider: 'stripe',
    status,
    current_period_end: periodEnd,
    stripe_subscription_id: subscription.id
  };
  if (customerId) updatePayload.stripe_customer_id = customerId;
  if (priceId) updatePayload.stripe_price_id = priceId;

  const { data, error } = await client
    .from('entitlements')
    .update(updatePayload)
    .eq('profile_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`upsertFromStripeSubscription failed: ${error.message}`);
  }
  return rowToEntitlement(data as RawRow);
}

/**
 * Marca una suscripción como `cancelled` sin tocar el `current_period_end`
 * (el usuario sigue con acceso hasta el final del período pagado).
 */
export async function markStripeSubscriptionCancelled(
  stripeSubscriptionId: string,
  client: EntitlementsClient = defaultClient()
): Promise<void> {
  const { error } = await client
    .from('entitlements')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (error) {
    throw new Error(`markStripeSubscriptionCancelled failed: ${error.message}`);
  }
}

/**
 * Actualiza solo el `current_period_end` (se llama desde
 * invoice.payment_succeeded para reflejar la renovación).
 */
export async function updateStripePeriodEnd(
  stripeSubscriptionId: string,
  periodEndUnix: number | null,
  client: EntitlementsClient = defaultClient()
): Promise<void> {
  const periodEnd = unixSecondsToIso(periodEndUnix);
  const { error } = await client
    .from('entitlements')
    .update({ current_period_end: periodEnd, status: 'active' })
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (error) {
    throw new Error(`updateStripePeriodEnd failed: ${error.message}`);
  }
}

/**
 * Marca status='past_due' tras un `invoice.payment_failed`. No toca el
 * período — la suscripción todavía existe en Stripe; si vuelve a cobrarse
 * con éxito vuelve a 'active'.
 */
export async function markStripePastDue(
  stripeSubscriptionId: string,
  client: EntitlementsClient = defaultClient()
): Promise<void> {
  const { error } = await client
    .from('entitlements')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (error) {
    throw new Error(`markStripePastDue failed: ${error.message}`);
  }
}

/**
 * Look-up por stripe_customer_id — útil para resolver el userId cuando el
 * evento del webhook no trae metadata.supabase_user_id.
 */
export async function findEntitlementByStripeCustomerId(
  stripeCustomerId: string,
  client: EntitlementsClient = defaultClient()
): Promise<Entitlement | null> {
  const { data, error } = await client
    .from('entitlements')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (error) {
    throw new Error(`findEntitlementByStripeCustomerId failed: ${error.message}`);
  }
  return data ? rowToEntitlement(data as RawRow) : null;
}
