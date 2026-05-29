'use client';

import { useEffect } from 'react';
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { clearLocalSession, createExternalSession } from '@/lib/session';

export function ClerkAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      clearLocalSession();
      return;
    }

    createExternalSession({
      provider: 'clerk',
      providerUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName || user.username
    });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-white/54">
        Abriendo tu cuenta...
      </div>
    );
  }

  if (!isSignedIn) {
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
                Tu cuenta mantiene tu sesión activa y separa tu perfil, plan y progreso de otros
                usuarios en este navegador.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <SignInButton mode="redirect">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
              >
                <LogIn aria-hidden="true" size={19} />
                Entrar
              </button>
            </SignInButton>

            <SignUpButton mode="redirect">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-4 py-4 text-base font-bold text-white transition hover:border-brand-mustard/70 hover:text-brand-mustard"
              >
                <UserPlus aria-hidden="true" size={19} />
                Crear cuenta
              </button>
            </SignUpButton>
          </div>

          <p className="mt-5 text-xs leading-5 text-white/46">
            Si ya estabas probando la app, entra con el mismo correo para mantener el acceso de
            forma estable. La sincronizacion completa de datos entre dispositivos requiere base de
            datos y queda como siguiente paso.
          </p>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
