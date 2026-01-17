/**
 * Service Worker for Crypto Cyber Survivors PWA
 *
 * Provides:
 * - Static asset caching for offline play
 * - Network-first strategy for API calls
 * - Offline fallback page
 */

const CACHE_NAME = 'crypto-survivors-v1';
const STATIC_CACHE = 'crypto-survivors-static-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/offline.html'];

// Assets to cache on first fetch
const DYNAMIC_CACHE_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.png$/,
  /\.jpg$/,
  /\.svg$/,
];

// Never cache these
const SKIP_CACHE_PATTERNS = [/supabase/, /binance/, /coinbase/, /api\//, /ws:/, /wss:/];

// =============================================================================
// INSTALL EVENT
// =============================================================================

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Failed to cache static assets:', err);
      })
  );
});

// =============================================================================
// ACTIVATE EVENT
// =============================================================================

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// =============================================================================
// FETCH EVENT
// =============================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and API requests
  if (SKIP_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return;
  }

  // For navigation requests, use network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline.html') || caches.match('/');
        })
        .then(response => response || fetch(request))
    );
    return;
  }

  // For static assets, use cache-first strategy
  const isDynamicAsset = DYNAMIC_CACHE_PATTERNS.some(pattern =>
    pattern.test(url.pathname)
  );

  if (isDynamicAsset) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version and update in background
          event.waitUntil(
            fetch(request)
              .then(networkResponse => {
                if (networkResponse.ok) {
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, networkResponse);
                  });
                }
              })
              .catch(() => {
                // Network failed, cached version still works
              })
          );
          return cachedResponse;
        }

        // Not in cache, fetch and cache
        return fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: network only
  event.respondWith(fetch(request));
});

// =============================================================================
// PUSH NOTIFICATIONS (Future)
// =============================================================================

self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'New update available!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Crypto Survivors', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// =============================================================================
// BACKGROUND SYNC (Future - Score Queue)
// =============================================================================

self.addEventListener('sync', event => {
  if (event.tag === 'score-sync') {
    console.log('[SW] Background sync: score-sync');
    // Future: Process offline score queue
  }
});
