// Landing pública "Próximamente / En mantenimiento" — 2026-07-15.
// Se muestra cuando MAINTENANCE_MODE=1. Se desactiva quitando la env var
// en Vercel (sin redeploy — el middleware la relee en runtime).
//
// Copy: primera versión funcional aprobada por Giuliana como interina;
// puede editarse en-place sin ceremonia hasta que aterrice el rediseño.

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-brand-navy text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full space-y-8">
        <div className="space-y-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.20em] text-brand-cyan">
            BilClimb
          </p>
          <h1 className="text-3xl font-extrabold leading-tight">
            Bill (y Senda) están en el taller.
          </h1>
        </div>
        <div className="space-y-4 text-base leading-7 text-white/80">
          <p>
            Estamos reconstruyendo BilClimb desde adentro para que sea el coach que
            queríamos que fuera: uno que lee tu condición actual, no tu currículum,
            y que arma un plan real de escalada — con seguridad primero, sin fingir
            certezas que no tenemos.
          </p>
          <p>
            La versión anterior no llegaba a eso. La próxima sí.
          </p>
          <p className="text-white/70">
            Mientras tanto, <strong className="text-white">seguí escalando</strong>.
            Cuando abramos, te avisamos.
          </p>
        </div>
        <div className="pt-4">
          <a
            href="mailto:belaypartnersorg@gmail.com?subject=BilClimb%20-%20aviso%20de%20apertura"
            className="inline-block rounded-md border border-brand-cyan/40 bg-brand-cyan/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.10em] text-brand-cyan hover:bg-brand-cyan/20 transition"
          >
            Avísame cuando abra
          </a>
        </div>
        <div className="pt-8 text-xs text-white/40 space-y-1">
          <p>
            Si te suscribiste antes, tus cobros están detenidos y te vamos a contactar
            por email para el reembolso.
          </p>
          <p>
            Dudas: <Link href="mailto:belaypartnersorg@gmail.com" className="underline hover:text-white/60">belaypartnersorg@gmail.com</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
