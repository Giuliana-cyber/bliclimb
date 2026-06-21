import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------- Tipos ----------

export type CoachTier = 'starter' | 'pro' | 'gym';
export type CoachClientStatus = 'pending' | 'accepted' | 'removed';

export type CoachClient = {
  id: string;
  coach_id: string;
  client_id: string | null;
  invite_token: string;
  invite_email: string | null;
  status: CoachClientStatus;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const COACH_TIER_LIMITS: Record<CoachTier, number> = {
  starter: 5,
  pro: 15,
  // 'gym' es "ilimitado" en marketing; usamos 999 como tope técnico.
  gym: 999
};

export type CoachClientsClient = SupabaseClient;

function defaultClient(): CoachClientsClient {
  return createAdminClient();
}

function appBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env;
  // En producción la env DEBE estar seteada — sin ella, los links de
  // invitación al coach saldrían apuntando a un dominio que el usuario
  // no usa y cada cliente recibiría un link roto. Mejor falla rápida.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL debe estar configurado en producción para generar links de invitación.'
    );
  }
  return 'https://bilclimb.vercel.app';
}

// ---------- Helpers ----------

/**
 * `true` si el usuario tiene `profiles.role = 'coach'` (o 'admin').
 */
export async function isCoach(
  userId: string,
  client: CoachClientsClient = defaultClient()
): Promise<boolean> {
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`isCoach failed: ${error.message}`);
  if (!data) return false;
  return data.role === 'coach' || data.role === 'admin';
}

/**
 * Lista de relaciones coach→cliente con `status='accepted'` (los clientes
 * activos del coach). No incluye invitaciones pendientes.
 */
export async function getCoachClients(
  coachId: string,
  client: CoachClientsClient = defaultClient()
): Promise<CoachClient[]> {
  const { data, error } = await client
    .from('coach_clients')
    .select('*')
    .eq('coach_id', coachId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });
  if (error) throw new Error(`getCoachClients failed: ${error.message}`);
  return (data ?? []) as CoachClient[];
}

/**
 * Cuenta de clientes activos (`status='accepted'`). Se compara contra
 * `entitlements.coach_max_clients` para enforzar el cupo del tier.
 */
export async function getCoachClientCount(
  coachId: string,
  client: CoachClientsClient = defaultClient()
): Promise<number> {
  const { count, error } = await client
    .from('coach_clients')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'accepted');
  if (error) throw new Error(`getCoachClientCount failed: ${error.message}`);
  return count ?? 0;
}

/**
 * `true` si el coach todavía puede aceptar un cliente más según su tier.
 * Si no tiene tier asignado en entitlements → false (no es coach pagado).
 */
export async function canAddClient(
  coachId: string,
  client: CoachClientsClient = defaultClient()
): Promise<boolean> {
  const { data, error } = await client
    .from('entitlements')
    .select('coach_max_clients')
    .eq('profile_id', coachId)
    .maybeSingle();
  if (error) throw new Error(`canAddClient failed: ${error.message}`);
  const max = data?.coach_max_clients;
  if (typeof max !== 'number' || max <= 0) return false;
  const current = await getCoachClientCount(coachId, client);
  return current < max;
}

/**
 * Crea una invitación: genera token único, guarda la fila con
 * `status='pending'` y devuelve la URL que el coach comparte con su cliente.
 *
 * `tokenGenerator` se inyecta en tests; default = crypto.randomUUID().
 */
export async function inviteClient(
  coachId: string,
  email: string,
  client: CoachClientsClient = defaultClient(),
  tokenGenerator: () => string = () => crypto.randomUUID()
): Promise<{ inviteToken: string; inviteUrl: string }> {
  const inviteToken = tokenGenerator();
  const { error } = await client.from('coach_clients').insert({
    coach_id: coachId,
    invite_token: inviteToken,
    invite_email: email,
    status: 'pending'
  });
  if (error) throw new Error(`inviteClient failed: ${error.message}`);
  return {
    inviteToken,
    inviteUrl: `${appBaseUrl()}/invite/${inviteToken}`
  };
}

/**
 * El cliente abre el link y queda asignado al coach. Idempotente: si la
 * invitación ya fue aceptada por el mismo cliente, no hace nada y devuelve
 * la fila. Falla si el token no existe o ya fue removido.
 */
export async function acceptInvite(
  clientId: string,
  inviteToken: string,
  client: CoachClientsClient = defaultClient()
): Promise<CoachClient> {
  const { data: row, error: readErr } = await client
    .from('coach_clients')
    .select('*')
    .eq('invite_token', inviteToken)
    .maybeSingle();
  if (readErr) throw new Error(`acceptInvite read failed: ${readErr.message}`);
  if (!row) throw new Error('Invitación no encontrada');
  const current = row as CoachClient;

  if (current.status === 'removed') {
    throw new Error('Invitación ya no es válida');
  }
  if (current.status === 'accepted' && current.client_id === clientId) {
    return current;
  }
  if (current.status === 'accepted' && current.client_id !== clientId) {
    throw new Error('Invitación ya fue aceptada por otro usuario');
  }

  const { data: updated, error: updErr } = await client
    .from('coach_clients')
    .update({
      client_id: clientId,
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', current.id)
    .select('*')
    .single();
  if (updErr) throw new Error(`acceptInvite update failed: ${updErr.message}`);
  return updated as CoachClient;
}

/**
 * El coach desvincula a un cliente. Setea `status='removed'`. Los planes
 * publicados quedan intactos (el cliente los sigue viendo) — solo se corta
 * la relación.
 */
export async function removeClient(
  coachId: string,
  clientId: string,
  client: CoachClientsClient = defaultClient()
): Promise<void> {
  const { error } = await client
    .from('coach_clients')
    .update({ status: 'removed' })
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('status', 'accepted');
  if (error) throw new Error(`removeClient failed: ${error.message}`);
}

/**
 * Aplica la suscripción del coach: setea `profiles.role='coach'` y graba
 * `entitlements.coach_tier` + `coach_max_clients` según el tier comprado.
 * Lo invoca el webhook de Stripe al detectar un price_id de coach.
 */
export async function applyCoachSubscription(
  userId: string,
  tier: CoachTier,
  client: CoachClientsClient = defaultClient()
): Promise<void> {
  const maxClients = COACH_TIER_LIMITS[tier];

  const { error: profileErr } = await client
    .from('profiles')
    .update({ role: 'coach' })
    .eq('id', userId);
  if (profileErr) throw new Error(`applyCoachSubscription profile failed: ${profileErr.message}`);

  const { error: entErr } = await client
    .from('entitlements')
    .update({ coach_tier: tier, coach_max_clients: maxClients })
    .eq('profile_id', userId);
  if (entErr) throw new Error(`applyCoachSubscription entitlement failed: ${entErr.message}`);
}

/**
 * Revoca la suscripción del coach: vuelve `profiles.role='athlete'` y limpia
 * `entitlements.coach_tier`/`coach_max_clients`. Lo invoca el webhook en
 * `customer.subscription.deleted`.
 *
 * No toca `coach_clients` ni `coach_plans` — esas filas quedan para que el
 * coach pueda recuperar acceso si vuelve a suscribirse. Los planes ya
 * publicados siguen vivos en el dashboard del cliente.
 */
export async function clearCoachSubscription(
  userId: string,
  client: CoachClientsClient = defaultClient()
): Promise<void> {
  const { error: profileErr } = await client
    .from('profiles')
    .update({ role: 'athlete' })
    .eq('id', userId);
  if (profileErr) throw new Error(`clearCoachSubscription profile failed: ${profileErr.message}`);

  const { error: entErr } = await client
    .from('entitlements')
    .update({ coach_tier: null, coach_max_clients: null })
    .eq('profile_id', userId);
  if (entErr) throw new Error(`clearCoachSubscription entitlement failed: ${entErr.message}`);
}

/**
 * Devuelve el coach activo (`status='accepted'`) de un cliente, o null.
 * Útil para el banner "Entrenando con [coach]" en el dashboard del cliente.
 */
export async function getClientCoach(
  clientId: string,
  client: CoachClientsClient = defaultClient()
): Promise<CoachClient | null> {
  const { data, error } = await client
    .from('coach_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (error) throw new Error(`getClientCoach failed: ${error.message}`);
  return data ? (data as CoachClient) : null;
}
