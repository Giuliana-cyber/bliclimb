// Carga de contexto para páginas del panel del coach. Server-only.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCoach, getCoachClientCount, COACH_TIER_LIMITS, type CoachTier } from './index';

export type CoachContext = {
  userId: string;
  email: string;
  name: string | null;
  tier: CoachTier | null;
  maxClients: number;
  currentClients: number;
};

/**
 * Resuelve el usuario actual y verifica que sea coach. Devuelve `null` si
 * - no hay sesión, o
 * - el usuario no tiene `role='coach'`.
 *
 * Las páginas del panel hacen redirect cuando esto es null.
 */
export async function loadCoachContext(): Promise<CoachContext | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const ok = await isCoach(user.id, admin);
  if (!ok) return null;

  const [profileRes, entitlementRes, currentClients] = await Promise.all([
    admin.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    admin
      .from('entitlements')
      .select('coach_tier, coach_max_clients')
      .eq('profile_id', user.id)
      .maybeSingle(),
    getCoachClientCount(user.id, admin)
  ]);

  const entRow = entitlementRes.data as
    | { coach_tier: CoachTier | null; coach_max_clients: number | null }
    | null;
  const tier = entRow?.coach_tier ?? null;
  const maxClients = entRow?.coach_max_clients ?? (tier ? COACH_TIER_LIMITS[tier] : 0);
  const profileRow = profileRes.data as { name: string | null } | null;

  return {
    userId: user.id,
    email: user.email ?? '',
    name: profileRow?.name ?? null,
    tier,
    maxClients,
    currentClients
  };
}
