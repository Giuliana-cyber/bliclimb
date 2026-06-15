'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { syncSupabaseSession } from '@/lib/session';
import { migrateLocalToSupabase } from '@/lib/db/migrate';

type Status = 'loading' | 'authenticated' | 'anonymous';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function handleAuthUser(nextUser: User | null) {
      if (cancelled) return;
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'anonymous');
      syncSupabaseSession(nextUser);

      if (nextUser) {
        try {
          await migrateLocalToSupabase(supabase, nextUser.id);
        } catch (error) {
          console.error('migration error', error);
        }
      }
    }

    supabase.auth.getUser().then(({ data }) => handleAuthUser(data.user));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) =>
      handleAuthUser(session?.user ?? null)
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-white/54">
        Abriendo tu cuenta...
      </div>
    );
  }

  if (status === 'anonymous' || !user) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <div className="rounded-2xl border border-brand-cyan/24 bg-white/[0.04] p-6 shadow-glow">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-cyan text-brand-dark">
              <ShieldCheck aria-hidden="true" size={24} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-cyan">BilClimb.ai</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">Inicia sesión</h1>
              <p className="mt-3 text-sm leading-6 text-white/68">
                Necesitas estar logueada para usar BilClimb.
              </p>
            </div>
          </div>
          <a
            href="/sign-in"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark hover:bg-brand-cyan/90"
          >
            Entrar
          </a>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
