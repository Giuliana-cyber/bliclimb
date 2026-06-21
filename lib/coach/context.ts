// Carga de contexto para páginas del panel del coach. Server-only.
//
// IMPORTANTE: el guard NUNCA llama a Stripe. Toda la decisión de acceso se
// resuelve leyendo `profiles.role` y `entitlements` de Supabase. Stripe solo
// escribe esos campos vía webhook — la fuente de verdad para el guard es la DB.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getCoachClientCount,
  COACH_TIER_LIMITS,
  type CoachTier
} from './index';

export type CoachContext = {
  userId: string;
  email: string;
  name: string | null;
  tier: CoachTier | null;
  maxClients: number;
  currentClients: number;
};

type DenyReason =
  | 'no_user'
  | 'profile_missing'
  | 'role_not_coach'
  | 'unexpected_error';

function logDeny(reason: DenyReason, payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      kind: 'coach_guard',
      ts: new Date().toISOString(),
      decision: 'deny',
      reason,
      ...payload
    })
  );
}

function logGrant(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      kind: 'coach_guard',
      ts: new Date().toISOString(),
      decision: 'grant',
      ...payload
    })
  );
}

/**
 * Resuelve el usuario actual y verifica que tenga acceso al panel del coach.
 *
 * Acceso concedido si EITHER:
 *   1. `profiles.role IN ('coach','admin')`
 *   2. Tiene un `entitlement` con `coach_tier IS NOT NULL`, `status='active'`
 *      y `current_period_end` en el futuro (suscripción de coach vigente).
 *
 * El doble criterio es defense in depth: si el webhook de Stripe falla en
 * actualizar `profiles.role` pero sí grabó el entitlement, el coach puede
 * entrar de todas formas. Si la DB está consistente ambos caminos arrojan
 * el mismo resultado.
 *
 * Devuelve `null` para que el layout haga `redirect('/coach/upgrade')`.
 * Los motivos de denegación se loguean en stdout para diagnóstico en Vercel.
 */
export async function loadCoachContext(): Promise<CoachContext | null> {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      logDeny('no_user', {});
      return null;
    }

    const admin = createAdminClient();

    // Leemos profile + entitlement en paralelo. NUNCA tocamos Stripe.
    const [profileRes, entitlementRes, currentClients] = await Promise.all([
      admin.from('profiles').select('name, role').eq('id', user.id).maybeSingle(),
      admin
        .from('entitlements')
        .select('coach_tier, coach_max_clients, status, current_period_end')
        .eq('profile_id', user.id)
        .maybeSingle(),
      getCoachClientCount(user.id, admin)
    ]);

    const profileRow = profileRes.data as
      | { name: string | null; role: string | null }
      | null;
    const entRow = entitlementRes.data as
      | {
          coach_tier: CoachTier | null;
          coach_max_clients: number | null;
          status: string | null;
          current_period_end: string | null;
        }
      | null;

    if (!profileRow) {
      logDeny('profile_missing', { userId: user.id });
      return null;
    }

    // Criterio 1: role en profiles.
    const roleOk = profileRow.role === 'coach' || profileRow.role === 'admin';

    // Criterio 2: entitlement de coach vigente.
    const periodEndMs = entRow?.current_period_end
      ? Date.parse(entRow.current_period_end)
      : NaN;
    const entitlementOk =
      Boolean(entRow?.coach_tier) &&
      entRow?.status === 'active' &&
      Number.isFinite(periodEndMs) &&
      periodEndMs > Date.now();

    if (!roleOk && !entitlementOk) {
      logDeny('role_not_coach', {
        userId: user.id,
        role: profileRow.role,
        coach_tier: entRow?.coach_tier ?? null,
        status: entRow?.status ?? null,
        current_period_end: entRow?.current_period_end ?? null
      });
      return null;
    }

    const tier = entRow?.coach_tier ?? null;
    const maxClients =
      entRow?.coach_max_clients ?? (tier ? COACH_TIER_LIMITS[tier] : 0);

    logGrant({
      userId: user.id,
      via: roleOk ? 'role' : 'entitlement',
      role: profileRow.role,
      tier,
      currentClients,
      maxClients
    });

    return {
      userId: user.id,
      email: user.email ?? '',
      name: profileRow.name ?? null,
      tier,
      maxClients,
      currentClients
    };
  } catch (error) {
    logDeny('unexpected_error', {
      message: error instanceof Error ? error.message : 'unknown'
    });
    return null;
  }
}
