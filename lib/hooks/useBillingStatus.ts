'use client';

import { useEffect, useState } from 'react';

export type BillingStatus = {
  status: 'active' | 'paused' | 'cancelled' | 'past_due' | 'pending' | null;
  hasActiveSubscription: boolean;
  freePlanUsedAt: string | null;
  freePlanExpiresAt: string | null;
  inFreePlanWindow: boolean;
};

type AuthStatusResponse = {
  supabaseConfigured: boolean;
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  billing?: BillingStatus;
};

/**
 * Hook compartido para que componentes cliente conozcan el estado de billing
 * del usuario actual. Hace 1 fetch a /api/auth/status al montar.
 *
 * Devuelve `null` mientras carga o si el endpoint no devuelve billing info.
 */
export function useBillingStatus(): BillingStatus | null {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) return;
        const data = (await response.json()) as AuthStatusResponse;
        if (cancelled) return;
        setStatus(data.billing ?? null);
      } catch {
        // Falla silenciosa — el banner simplemente no se renderiza.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
