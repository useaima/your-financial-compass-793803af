// Custom service worker additions for PWABuilder compatibility
// This file is merged with the auto-generated workbox SW

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-financial-data') {
    event.waitUntil(syncFinancialData());
  }
});

async function syncFinancialData() {
  // Placeholder for background sync logic
  console.log('[SW] Background sync triggered');
}

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-insights') {
    event.waitUntil(checkInsights());
  }
});

async function checkInsights() {
  console.log('[SW] Periodic sync: checking insights');
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FinanceAI';
  const options = {
    body: data.body || 'You have a new financial insight!',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: data.tag || 'financeai-notification',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Offline support - serve cached page when offline
self.addEventListener('fetch', (event) => {
  // Let workbox handle most requests; this is a fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
  }
});
