'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker en producción. En dev lo dejamos apagado para
 * que los cambios se reflejen sin tener que limpiar caches.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // Falla silenciosa — la app funciona sin SW.
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
