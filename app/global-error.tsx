'use client';

// global-error.tsx es el último recurso de Next.js: se renderiza cuando
// incluso app/layout.tsx falla, o cuando hay un crash en el árbol del
// RootLayout antes de montar app/error.tsx. Por eso DEBE renderizar
// su propio <html> y <body> — no hereda el layout.
//
// Mantenemos el estilo minimal e inline porque el bundle de CSS del
// layout puede no estar disponible si el crash ocurrió antes de la
// hidratación.

import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const digest = error.digest ?? null;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[BilClimb] Fatal layout/server error', {
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
      // ignore
    }
  }

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0A0F1A',
          color: '#fff',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
      >
        <main
          style={{
            margin: '0 auto',
            maxWidth: '28rem',
            minHeight: '80vh',
            padding: '3rem 1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(248, 113, 113, 0.15)',
              color: '#fca5a5',
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
              fontWeight: 800
            }}
          >
            !
          </div>
          <h1 style={{ marginTop: 20, fontSize: 24, fontWeight: 800 }}>
            Algo falló de nuestro lado
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.72)'
            }}
          >
            Ya quedó registrado en nuestros logs. Probá recargar — si el
            problema persiste, copiá este código y mandanoslo:
          </p>

          {digest ? (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)'
              }}
            >
              <code
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)'
                }}
              >
                {digest}
              </code>
              <button
                type="button"
                onClick={copyDigest}
                aria-label="Copiar código de error"
                style={{
                  height: 32,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2DD4BF',
                  color: '#0A0F1A',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          ) : (
            <p
              style={{
                marginTop: 16,
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)'
              }}
            >
              (no hay código identificador disponible para este error)
            </p>
          )}

          <div style={{ marginTop: 24, width: '100%', display: 'grid', gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: '#2DD4BF',
                color: '#0A0F1A',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                height: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.72)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Volver al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
