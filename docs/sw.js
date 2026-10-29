/**
 * 1mb Service Worker
 * Offline support: network-first for pages, cache-first for static assets.
 */

const CACHE_NAME = '1mb-dev';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/site.webmanifest',
  '/assets/css/style.css',
  '/assets/js/theme.js',
  '/assets/js/counter.js',
  '/assets/js/sw-register.js',
  '/assets/images/favicon.svg',
  '/assets/images/logo.svg',
];

const FONT_ASSETS = [
  '/assets/fonts/inter-latin.woff2',
  '/assets/fonts/space-grotesk-700-latin.woff2',
];

// Install: cache static assets and fonts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...STATIC_ASSETS, ...FONT_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
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

// Fetch: network-first for pages and API, stale-while-revalidate for fonts, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for pages: work status must not lag a deploy. Visited pages stay readable offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Network-first for counter API
  if (url.hostname.includes('workers.dev')) {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(JSON.stringify({ count: 0, offline: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    return;
  }

  // Stale-while-revalidate for fonts
  if (url.pathname.includes('/assets/fonts/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) return response;

        // Clone and cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));

        return response;
      });
    })
  );
});
