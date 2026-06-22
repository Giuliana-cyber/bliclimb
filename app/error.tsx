'use client';

// Error boundary para Server Components y route handlers que crashean
// dentro del segmento raíz. Cubre todo el árbol except el RootLayout en
// sí — para eso está global-error.tsx.
//
// El digest es un hash que Next.js produce server-side cuando el build
// está en producción. Visible al usuario para que lo pueda copiar y
// mandarnos por soporte; nosotros lo correlacionamos contra los logs
// de Vercel para encontrar la excepción exacta.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, RotateCw } from 'lucide-react';

export default function GlobalSegmentError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const digest = error.digest ?? null;

  useEffect(() => {
    // Loguear en consola del cliente para que el usuario que abra
    // devtools vea el digest + mensaje. Ayuda al soporte sin depender
    // de copy-paste manual.
    // eslint-disable-next-line no-console
    console.error('[BilClimb] Server-side exception', {
      digest,
      message: error.message
    });
  }, [digest, error.message]);

  async function copyDigest() {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Algunos browsers requieren contexto seguro o gesto explícito;
      // si falla, el usuario puede leer el código directo en pantalla.
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center text-white">
      <div className="grid size-14 place-items-center rounded-2xl bg-red-400/15 text-red-300">
        <AlertTriangle aria-hidden="true" size={28} strokeWidth={2.4} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">Algo falló de nuestro lado</h1>
      <p className="mt-3 text-sm leading-6 text-white/72">
        Ya quedó registrado en nuestros logs. Probá recargar — si el problema
        persiste, copiá este código y mandanoslo:
      </p>

      {digest ? (
        <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <code className="min-w-0 flex-1 truncate text-xs font-bold text-white/85">
            {digest}
          </code>
          <button
            type="button"
            onClick={copyDigest}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-cyan px-2 text-[0.65rem] font-bold text-brand-dark hover:brightness-110"
            aria-label="Copiar código de error"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[0.7rem] text-white/45">
          (no hay código identificador disponible para este error)
        </p>
      )}

      <div className="mt-6 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan px-4 text-sm font-extrabold text-brand-dark hover:brightness-110"
        >
          <RotateCw size={15} aria-hidden="true" />
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-white/72 hover:bg-white/[0.04]"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
