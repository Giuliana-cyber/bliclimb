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

  return {
    status: entitlement.status,
    currentPeriodEnd: entitlement.current_period_end,
    freePlanUsedAt: entitlement.free_plan_used_at,
    hasActiveAccess: hasActive
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
