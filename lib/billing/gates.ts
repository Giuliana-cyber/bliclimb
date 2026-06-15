import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  canGenerateFreePlan,
  getEntitlement,
  hasActiveSubscription,
  markFreePlanUsed as dbMarkFreePlanUsed
} from '@/lib/entitlements';

// TODO(billing-cleanup): retirar después de la primera semana en producción.
// Cookie legacy del gate freemium basado en cookie firmada.
// Solo se lee para migración suave: si el usuario tiene la cookie pero no fila
// en entitlements todavía, sembramos free_plan_used_at = now() para no regalarle
// un segundo "primer plan gratis" por el cambio de implementación.
const LEGACY_FREE_PLAN_COOKIE = 'bilclimb_free_plan_used';

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function backfillFromLegacyCookie(userId: string): Promise<void> {
  const cookieStore = cookies();
  const hasLegacy = cookieStore.get(LEGACY_FREE_PLAN_COOKIE)?.value === '1';
  if (!hasLegacy) return;

  // Si la cookie está presente pero la fila aún no tiene free_plan_used_at,
  // marcamos ahora para preservar el estado anterior.
  const entitlement = await getEntitlement(userId);
  if (entitlement.free_plan_used_at === null) {
    await dbMarkFreePlanUsed(userId);
  }
}

const UNAUTHENTICATED = NextResponse.json(
  {
    code: 'auth_required',
    error: 'Tenés que iniciar sesión para usar esta función.'
  },
  { status: 401 }
);

const PAYMENT_REQUIRED_PLAN = NextResponse.json(
  {
    code: 'payment_required',
    error:
      'Ya usaste tu plan gratis. Suscribite por $1/mes para regenerar y seguir entrenando con IA.'
  },
  { status: 402 }
);

const PAYMENT_REQUIRED_CHAT = NextResponse.json(
  {
    code: 'payment_required',
    error:
      'El chat con IA requiere una suscripción activa. Suscribite por $1/mes para hablar con Bill o Senda.'
  },
  { status: 402 }
);

/**
 * Gate para /api/generate-plan.
 *
 * Reglas:
 * 1. Si REQUIRE_SUBSCRIPTION !== 'true' → permitido (modo dev).
 * 2. Si no hay user autenticado → 401.
 * 3. Si tiene suscripción activa → permitido.
 * 4. Si tiene free_plan_used_at null → permitido (consumirá su gratuito).
 * 5. En otro caso → 402.
 *
 * Devuelve `{ allowed: true, userId }` si pasa, o `NextResponse` con el error.
 */
export type PlanGateDecision =
  | { allowed: true; userId: string }
  | { allowed: false; response: NextResponse };

export async function gatePlanGeneration(): Promise<PlanGateDecision> {
  if (process.env.REQUIRE_SUBSCRIPTION !== 'true') {
    const userId = (await getAuthenticatedUserId()) ?? 'dev-anon';
    return { allowed: true, userId };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { allowed: false, response: UNAUTHENTICATED };
  }

  // Migración suave del estado del cookie legacy a entitlements
  await backfillFromLegacyCookie(userId);

  const [activeSub, freeAvailable] = await Promise.all([
    hasActiveSubscription(userId),
    canGenerateFreePlan(userId)
  ]);

  if (activeSub || freeAvailable) {
    return { allowed: true, userId };
  }

  return { allowed: false, response: PAYMENT_REQUIRED_PLAN };
}

/**
 * Gate para /api/chat. El chat requiere SIEMPRE suscripción activa una vez
 * habilitado REQUIRE_SUBSCRIPTION (no hay versión gratis del chat).
 */
export type ChatGateDecision =
  | { allowed: true; userId: string | null }
  | { allowed: false; response: NextResponse };

export async function gateChat(): Promise<ChatGateDecision> {
  if (process.env.REQUIRE_SUBSCRIPTION !== 'true') {
    const userId = await getAuthenticatedUserId();
    return { allowed: true, userId };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { allowed: false, response: UNAUTHENTICATED };
  }

  const active = await hasActiveSubscription(userId);
  if (active) {
    return { allowed: true, userId };
  }

  return { allowed: false, response: PAYMENT_REQUIRED_CHAT };
}

/**
 * Marca el plan gratis como usado tras una generación exitosa.
 * Llamar solo si REQUIRE_SUBSCRIPTION === 'true' y el usuario no tenía suscripción
 * activa al momento de generar.
 */
export async function markFreePlanConsumed(userId: string): Promise<void> {
  if (process.env.REQUIRE_SUBSCRIPTION !== 'true') return;
  if (userId === 'dev-anon') return;
  const activeSub = await hasActiveSubscription(userId);
  if (activeSub) return;
  await dbMarkFreePlanUsed(userId);
}
