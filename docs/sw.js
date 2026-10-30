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

// Fetch: network-first for pages, CSS and JS; stale-while-revalidate for fonts; cache-first for the rest
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cross-origin (the counter API): straight to the network. A failure must reach counter.js
  // as a failure; a stand-in response would read as a count, or as a vote that never landed.
  if (url.origin !== self.location.origin) return;

  // Network-first for pages: work status must not lag a deploy. Visited pages stay readable offline.
  // CSS and JS too: the old worker serves the first view after a deploy, and a cached stylesheet
  // under new HTML breaks any renamed class.
  const isPage = event.request.mode === 'navigate';
  if (isPage || /\.(css|js)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || (isPage ? caches.match('/') : Response.error()))
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
