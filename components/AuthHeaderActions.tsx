'use client';

import Link from 'next/link';
import { CreditCard, Settings, UserRound } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-cyan/60 hover:text-brand-cyan"
        aria-label="Abrir ajustes"
        title="Ajustes"
      >
        <Settings aria-hidden="true" size={19} strokeWidth={2.2} />
      </button>
      <Link
        href="/subscribe"
        className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-cyan/60 hover:text-brand-cyan"
        aria-label="Abrir suscripcion"
        title="Suscripcion"
      >
        <CreditCard aria-hidden="true" size={19} strokeWidth={2.2} />
      </Link>
      {clerkEnabled ? (
        <div className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
          <UserButton afterSignOutUrl="/" />
        </div>
      ) : (
        <Link
          href="/profile"
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-mustard/70 hover:text-brand-mustard"
          aria-label="Abrir perfil"
          title="Perfil"
        >
          <UserRound aria-hidden="true" size={19} strokeWidth={2.2} />
        </Link>
      )}
    </div>
  );
}
