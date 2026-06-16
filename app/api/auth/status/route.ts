import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  freePlanExpiresAt,
  getEntitlement,
  hasActiveSubscription
} from '@/lib/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasSupabaseEnv) {
    return NextResponse.json({
      supabaseConfigured: false,
      authenticated: false
    });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      supabaseConfigured: true,
      authenticated: false,
      userId: null,
      email: null
    });
  }

  // Si las env vars del admin no están configuradas, la fila de entitlements
  // no se puede leer — devolvemos auth básico sin billing info.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      supabaseConfigured: true,
      authenticated: true,
      userId: user.id,
      email: user.email ?? null
    });
  }

  const admin = createAdminClient();
  const [entitlement, hasActive] = await Promise.all([
    getEntitlement(user.id, admin),
    hasActiveSubscription(user.id, admin)
  ]);
  const expiresAt = freePlanExpiresAt(entitlement);
  const inFreeWindow =
    !hasActive &&
    expiresAt !== null &&
    expiresAt.getTime() > Date.now();

  return NextResponse.json({
    supabaseConfigured: true,
    authenticated: true,
    userId: user.id,
    email: user.email ?? null,
    billing: {
      status: entitlement.status,
      hasActiveSubscription: hasActive,
      freePlanUsedAt: entitlement.free_plan_used_at,
      freePlanExpiresAt: expiresAt?.toISOString() ?? null,
      inFreePlanWindow: inFreeWindow
    }
  });
}
