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
 * - `status === 'active'` AND `current_period_end > now()`.
 * - 'cancelled' con `current_period_end > now()` también cuenta como activo (cancelado
 *   pero todavía dentro del período pagado).
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
 * true si el usuario puede usar features que dependen de tener un plan
 * "vivo" (chat, sesión, check-ins). Devuelve true cuando:
 *   - tiene suscripción activa O cancelada con período vigente, O
 *   - está dentro de la ventana de mes gratis (post-primer-plan).
 *
 * Nota: si el usuario nunca generó un plan, esta función devuelve false —
 * el chat no debería ser usable sin contexto de plan.
 */
export async function hasActivePlanAccess(
  userId: string,
  client: EntitlementsClient = defaultClient()
): Promise<boolean> {
  const [activeSub, withinFreeWindow] = await Promise.all([
    hasActiveSubscription(userId, client),
    isWithinFreePlanWindow(userId, client)
  ]);
  return activeSub || withinFreeWindow;
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
