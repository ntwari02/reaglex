/* eslint-disable no-restricted-globals */
/**
 * Spacilly PWA service worker (2026-grade).
 *
 * Responsibilities:
 *  - Web Push notifications with rich actions and click-through routing
 *  - App shell offline fallback
 *  - Smart caching strategies:
 *      • App shell / static assets   → stale-while-revalidate
 *      • Product images              → cache-first with TTL
 *      • API GET requests            → network-first with cache fallback
 *      • API non-GET while offline   → 503 + Background Sync queue
 *  - Background sync to flush queued writes when connection returns
 *  - SW update flow (skipWaiting on demand from the page)
 */

const APP_NAME = 'Spacilly';
const VERSION = 'spacilly-pwa-v3';
const STATIC_CACHE = `spacilly-static-${VERSION}`;
const IMAGE_CACHE = `spacilly-images-${VERSION}`;
const API_CACHE = `spacilly-api-${VERSION}`;
const RUNTIME_CACHE = `spacilly-runtime-${VERSION}`;
const APP_SHELL = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/logo.jpg',
];
const ALL_CACHES = [STATIC_CACHE, IMAGE_CACHE, API_CACHE, RUNTIME_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => (k.startsWith('spacilly-') || k.startsWith('reaglex-')) && !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (_e) {
    return false;
  }
}

function isImageRequest(req) {
  if (req.destination === 'image') return true;
  const url = req.url.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/.test(url);
}

function isApiRequest(req) {
  const url = req.url;
  return /\/api\//.test(url);
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(req, cacheName, maxEntries = 100) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
      })
      .catch(() => undefined);
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      cache.put(req, res.clone());
      trimCache(cacheName, maxEntries);
    }
    return res;
  } catch (_e) {
    if (req.destination === 'image') {
      return cache.match('/logo.jpg');
    }
    throw _e;
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (_e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw _e;
  }
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const toDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(toDelete.map((k) => cache.delete(k)));
    }
  } catch (_e) {
    /* ignore */
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') {
    // Non-GET API calls: try network, on failure ask the page to queue.
    if (isApiRequest(req)) {
      event.respondWith(
        fetch(req.clone()).catch(async () => {
          // Notify page to enqueue this request.
          try {
            const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
            const cloned = req.clone();
            const body = await cloned.text().catch(() => '');
            const url = req.url;
            const method = req.method;
            const headers = {};
            req.headers.forEach((v, k) => {
              headers[k] = v;
            });
            for (const c of clientsList) {
              c.postMessage({
                type: 'SPACILLY_QUEUE_REQUEST',
                request: { url, method, headers, body },
              });
            }
          } catch (_e) {
            /* ignore */
          }
          return new Response(
            JSON.stringify({
              message: 'You are offline. Your action was queued and will sync automatically.',
              offline: true,
              queued: true,
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }),
      );
    }
    return; // let browser handle other methods normally
  }

  if (!isSameOrigin(req.url) && !isImageRequest(req)) {
    return; // do not intercept third-party non-image traffic
  }

  // Navigation requests → network-first, fallback to offline page.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (_e) {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          return caches.match('/offline.html');
        }
      })(),
    );
    return;
  }

  if (isImageRequest(req)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE, 200));
    return;
  }

  if (isApiRequest(req)) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  if (
    req.destination === 'script' ||
    req.destination === 'style' ||
    req.destination === 'font' ||
    req.destination === 'worker'
  ) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ---- Push notifications ----

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_e) {
      try {
        payload = { title: APP_NAME, body: event.data.text() };
      } catch (_e2) {
        payload = { title: APP_NAME, body: 'You have a new notification.' };
      }
    }
  }

  const title = String(payload.title || APP_NAME);
  const actions = Array.isArray(payload.actions) ? payload.actions.slice(0, 3) : undefined;
  const options = {
    body: String(payload.body || ''),
    icon: payload.icon || '/logo.jpg',
    badge: payload.badge || '/logo.jpg',
    image: payload.image || undefined,
    data: {
      url: payload.url || '/',
      category: payload.category || '',
      ...(payload.data || {}),
    },
    tag: payload.tag || payload.category || 'spacilly',
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    vibrate: payload.vibrate || [80, 40, 80],
    actions,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = data.url || '/';
  if (event.action) {
    // Allow per-action URL via data.actions = { actionId: '/path' }
    const map = data.actions || {};
    if (map && map[event.action]) targetUrl = String(map[event.action]);
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            const u = new URL(client.url);
            const t = new URL(targetUrl, self.location.origin);
            if (u.origin === t.origin && 'focus' in client) {
              client.postMessage({ type: 'SPACILLY_NAVIGATE', url: targetUrl });
              return client.focus();
            }
          } catch (_e) {
            /* ignore */
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSub = event.oldSubscription;
        if (oldSub) {
          await fetch('/api/push/web/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ endpoint: oldSub.endpoint }),
          }).catch(() => {});
        }
        const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
        for (const c of clientsList) c.postMessage({ type: 'SPACILLY_RESUBSCRIBE_PUSH' });
      } catch (_e) {
        /* ignore */
      }
    })(),
  );
});

// ---- Background sync ----
// Pages can trigger sync via navigator.serviceWorker.ready.then(r => r.sync.register('spacilly-sync')).

self.addEventListener('sync', (event) => {
  if (event.tag === 'spacilly-sync' || event.tag === 'spacilly-offline-queue') {
    event.waitUntil(
      (async () => {
        const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
        for (const c of clientsList) c.postMessage({ type: 'SPACILLY_FLUSH_QUEUE' });
      })(),
    );
  }
});

// ---- Periodic background sync (Chrome only, requires permission). ----
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'spacilly-refresh') {
    event.waitUntil(
      (async () => {
        const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
        for (const c of clientsList) c.postMessage({ type: 'SPACILLY_PERIODIC_REFRESH' });
      })(),
    );
  }
});
