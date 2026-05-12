'use client';

import { useEffect, useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { loadProfile } from '@/lib/profile';
import {
  createLocalSession,
  touchLocalSession,
  type LocalSession
} from '@/lib/session';

export function LocalAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activeSession = touchLocalSession();
    const profile = loadProfile();

    setSession(activeSession);
    setName(activeSession?.name ?? profile?.name ?? '');
    setEmail(activeSession?.email ?? '');
    setReady(true);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSession = createLocalSession({ email, name });
    setSession(nextSession);
  }

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-white/54">
        Abriendo tu sesión...
      </div>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <div className="rounded-lg border border-brand-cyan/24 bg-white/[0.04] p-6 shadow-glow">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-brand-cyan text-brand-dark">
              <ShieldCheck aria-hidden="true" size={24} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-cyan">BilClimb.ai</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">Inicia sesión</h1>
              <p className="mt-3 text-sm leading-6 text-white/68">
                Usa el mismo correo para mantener tu perfil, plan y progreso en este navegador.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-white/76">Correo</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-white/10 bg-brand-dark px-4 py-3 text-base text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
                placeholder="tu@email.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-white/76">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="given-name"
                className="mt-2 w-full rounded-md border border-white/10 bg-brand-dark px-4 py-3 text-base text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
                placeholder="Tu nombre"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
            >
              <LogIn aria-hidden="true" size={19} />
              Entrar
            </button>
          </form>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
