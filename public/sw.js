const CACHE_NAME = 'friday-ai-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Do not intercept API or WebSocket calls
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});

// Notification Click Handler: Triggered when user taps notification on Android / Desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const isFocusFriday = data.action === 'focus-friday';
  const targetUrl = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If action was 'dismiss', do nothing further
      if (event.action === 'dismiss') return;

      // Bring existing Friday window to focus
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (!isFocusFriday && targetUrl && targetUrl !== '/') {
            client.postMessage({ type: 'BACKGROUND_LAUNCH_CLICKED', url: targetUrl });
          }
          return;
        }
      }

      // If no window was open, open Friday or targetUrl
      if (clients.openWindow) {
        return clients.openWindow(isFocusFriday ? '/' : targetUrl);
      }
    })
  );
});

// Immediate Focus Message Handler: Focus Friday window when returned from external tab
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FOCUS_FRIDAY') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
      })
    );
  }
});

