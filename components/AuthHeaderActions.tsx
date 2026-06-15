'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, LogOut, Settings, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function AuthHeaderActions() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  }

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
        aria-label="Abrir suscripción"
        title="Suscripción"
      >
        <CreditCard aria-hidden="true" size={19} strokeWidth={2.2} />
      </Link>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-mustard/70 hover:text-brand-mustard"
          aria-label="Abrir perfil"
          aria-expanded={open}
        >
          <UserRound aria-hidden="true" size={19} strokeWidth={2.2} />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-white/10 bg-brand-dark/98 p-2 shadow-glow backdrop-blur"
          >
            {email ? (
              <p className="truncate px-3 py-2 text-xs text-white/56">{email}</p>
            ) : null}
            <Link
              href="/profile"
              className="block rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
              onClick={() => setOpen(false)}
            >
              Mi perfil
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut aria-hidden="true" size={16} />
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
