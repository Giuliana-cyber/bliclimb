import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEntitlement, hasActiveSubscription } from '@/lib/entitlements';
import { SettingsContent } from '@/components/settings/SettingsContent';
import {
  SubscriptionPanel,
  type SubscriptionPanelData
} from '@/components/settings/SubscriptionPanel';

export const runtime = 'nodejs';
// Lectura de DB por request → no cachear.
export const dynamic = 'force-dynamic';

async function loadSubscriptionData(): Promise<SubscriptionPanelData | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const [entitlement, hasActive] = await Promise.all([
    getEntitlement(user.id, admin),
    hasActiveSubscription(user.id, admin)
  ]);

  // Resolver el ciclo de cobro a partir del price_id guardado.
  const annualId =
    process.env.STRIPE_ANNUAL_PRICE_ID ?? process.env.STRIPE_PRICE_ID ?? null;
  const monthlyId = process.env.STRIPE_MONTHLY_PRICE_ID ?? null;
  let billingCycle: 'monthly' | 'annual' | null = null;
  if (entitlement.stripe_price_id) {
    if (monthlyId && entitlement.stripe_price_id === monthlyId) {
      billingCycle = 'monthly';
    } else if (annualId && entitlement.stripe_price_id === annualId) {
      billingCycle = 'annual';
    }
  }

  return {
    status: entitlement.status,
    currentPeriodEnd: entitlement.current_period_end,
    freePlanUsedAt: entitlement.free_plan_used_at,
    hasActiveAccess: hasActive,
    billingCycle
  };
}

export default async function SettingsPage() {
  const data = await loadSubscriptionData();

  return (
    <SettingsContent
      subscriptionPanel={data ? <SubscriptionPanel data={data} /> : null}
    />
  );
}
