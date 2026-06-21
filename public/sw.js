/* eslint-disable */
// BilClimb · service worker mínimo.
//
// Estrategia: stale-while-revalidate solo para assets estáticos del propio
// origen. Nada de cachear APIs, auth, datos del usuario, eventos de Supabase
// ni endpoints de Stripe — esos siempre van a la red.
//
// Cambiá CACHE_NAME para forzar invalidación cuando despleguemos cambios
// disruptivos.

// v2: agregado push + notificationclick. Cambiar el nombre fuerza
// invalidación del cache cuando un cliente con SW v1 se actualice.
const CACHE_NAME = 'bilclimb-shell-v2';

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

// ---------- Push notifications ----------
// El server manda payload JSON { title, body, url?, tag? } cifrado con las
// claves p256dh/auth de esta subscripción. El navegador desencripta y nos
// llega como event.data.

self.addEventListener('push', (event) => {
  let data = { title: 'BilClimb', body: '' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') data = { ...data, ...parsed };
    }
  } catch (_e) {
    // Algunos OS mandan push de prueba sin payload — mostramos default.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'BilClimb', {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: data.url || '/',
      tag: data.tag || 'bilclimb-default',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data) || '/';
  event.waitUntil(
    (async () => {
      // Si la app ya está abierta en alguna pestaña/instancia, navegamos
      // ahí en vez de abrir una nueva — UX más natural en PWA.
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      for (const client of allClients) {
        if (client.url && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch (_e) {
              // ignore
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })()
  );
});
