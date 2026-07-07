import {
  BillingSuccess,
  type BillingSuccessCycle
} from '@/components/billing/BillingSuccess';
import { getStripe } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
// Retrieve a Stripe por request; nunca cachear.
export const dynamic = 'force-dynamic';

async function resolveCycleFromSession(sessionId: string | undefined): Promise<BillingSuccessCycle> {
  if (!sessionId) return null;
  try {
    const stripe = getStripe();
    // Stripe es la fuente de verdad — un usuario no puede spoofear el ciclo
    // porque el retrieve devuelve la metadata que puso el checkout server.
    // Si el session_id no es válido, retrieve throwea → caemos a fallback.
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const cycle = session.metadata?.billing_cycle;
    if (cycle === 'monthly' || cycle === 'annual') return cycle;
    return null;
  } catch (error) {
    // No queremos que un fallo transitorio de Stripe rompa la pantalla de
    // éxito — el pago ya ocurrió. Loggeamos y servimos el fallback.
    console.warn(
      JSON.stringify({
        kind: 'billing_success_stripe_lookup_failed',
        message: error instanceof Error ? error.message : 'unknown'
      })
    );
    return null;
  }
}

export default async function BillingSuccessPage({
  searchParams
}: {
  searchParams?: { session_id?: string };
}) {
  const billingCycle = await resolveCycleFromSession(searchParams?.session_id);
  return <BillingSuccess billingCycle={billingCycle} />;
}
