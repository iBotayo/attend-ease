/**
 * Attend Ease - Progressive Web Application Service Worker
 *
 * PRIVACY & SECURITY BOUNDARIES:
 * 1. Safe static assets and application shell resources are cached to allow offline page loading.
 * 2. API requests (/api/*), authenticated responses, user credentials, employee rosters,
 *    and facial biometric captures are EXPLICITLY EXCLUDED from Service Worker HTTP caching.
 * 3. Offline attendance events are captured and queued via IndexedDB at the application layer,
 *    NOT via uncontrolled Service Worker HTTP request interception.
 */

const CACHE_NAME = 'attend-ease-shell-v1';

// Safe static shell resources
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/icon.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal issue:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. CRITICAL SECURITY: Never cache API requests, sensitive endpoints, or external analytics
  if (
    url.pathname.startsWith('/api') ||
    request.headers.has('Authorization') ||
    request.headers.has('X-Organization-Id')
  ) {
    return;
  }

  // 3. For HTML navigation requests: Try network first, fall back to cached page or /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return (await cache.match('/offline')) || Response.error();
      })
    );
    return;
  }

  // 4. For static assets (JS chunks, CSS, fonts, SVG/PNG images): Cache-first with network fallback
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cache and optionally update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        });
      })
    );
  }
});
