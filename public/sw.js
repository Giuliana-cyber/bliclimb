/* eslint-disable */
// BilClimb · service worker mínimo.
//
// Estrategia: stale-while-revalidate solo para assets estáticos del propio
// origen. Nada de cachear APIs, auth, datos del usuario, eventos de Supabase
// ni endpoints de Stripe — esos siempre van a la red.
//
// Cambiá CACHE_NAME para forzar invalidación cuando despleguemos cambios
// disruptivos.

const CACHE_NAME = 'bilclimb-shell-v1';

// Solo metemos en cache cosas seguras: el shell y los íconos del manifest.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS).catch(() => {
          // Si algún ícono no está, no rompemos la instalación.
        })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cachear cross-origin (Stripe, Supabase, OpenAI, fuentes externas).
  if (url.origin !== self.location.origin) return;

  // Nunca cachear endpoints de API / auth / webhooks.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  // Solo cacheamos respuestas que el navegador puede usar sin problema.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
