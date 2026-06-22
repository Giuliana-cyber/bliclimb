// 404 fallback. Server component (no client-side state necesario).

import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center text-white">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-cyan/14 text-brand-cyan">
        <Compass aria-hidden="true" size={28} strokeWidth={2.3} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">Esta página no existe</h1>
      <p className="mt-3 text-sm leading-6 text-white/72">
        El link puede estar roto, expirado, o la página se movió. Volvé al
        inicio o a tu plan.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Link
          href="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-cyan px-4 text-sm font-extrabold text-brand-dark hover:brightness-110"
        >
          Volver al inicio
        </Link>
        <Link
          href="/plan"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-white/72 hover:bg-white/[0.04]"
        >
          Ir a mi plan
        </Link>
      </div>
    </main>
  );
}
