'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { ClerkAuthGate } from '@/components/ClerkAuthGate';
import { LocalAuthGate } from '@/components/LocalAuthGate';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const allowLocalAuth = process.env.NODE_ENV !== 'production';

export function AuthGate({ children }: { children: React.ReactNode }) {
  if (clerkEnabled) {
    return <ClerkAuthGate>{children}</ClerkAuthGate>;
  }

  if (!allowLocalAuth) {
    return <MissingClerkConfig />;
  }

  return <LocalAuthGate>{children}</LocalAuthGate>;
}

function MissingClerkConfig() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
      <div className="rounded-lg border border-brand-mustard/34 bg-brand-mustard/10 p-6 shadow-glow">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-md bg-brand-mustard text-brand-dark">
            <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-mustard">Clerk no está activo</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Falta configurar el login real
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Este deploy no recibió las variables de Clerk durante el build. Agrega
              <span className="font-bold"> NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> y
              <span className="font-bold"> CLERK_SECRET_KEY</span> en Vercel para Production y haz
              redeploy.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-white/10 bg-brand-dark/54 p-4 text-sm leading-6 text-white/68">
          Prueba rápida después del redeploy:
          <span className="mt-2 block font-mono text-xs text-brand-cyan">
            /api/auth/status
          </span>
          Debe devolver <span className="font-bold text-white">clerkConfigured: true</span>.
        </div>

        <Link
          href="/sign-in"
          className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-white/12 px-4 py-3 text-sm font-bold text-white/78 transition hover:bg-white/[0.05]"
        >
          Revisar página de inicio de sesión
        </Link>
      </div>
    </section>
  );
}
