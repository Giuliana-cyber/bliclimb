'use client';

import { ClerkAuthGate } from '@/components/ClerkAuthGate';
import { LocalAuthGate } from '@/components/LocalAuthGate';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthGate({ children }: { children: React.ReactNode }) {
  if (clerkEnabled) {
    return <ClerkAuthGate>{children}</ClerkAuthGate>;
  }

  return <LocalAuthGate>{children}</LocalAuthGate>;
}
