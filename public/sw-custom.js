// Custom service worker for PWABuilder compatibility
// This file is imported by the workbox-generated SW via importScripts

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-financial-data') {
    event.waitUntil(syncFinancialData());
  }
});

async function syncFinancialData() {
  try {
    const cache = await caches.open('offline-spending');
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        await fetch(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await cache.delete(request);
      }
    }
    console.log('[SW] Background sync completed');
  } catch (e) {
    console.error('[SW] Background sync failed:', e);
  }
}

// Periodic Sync — check for new insights
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-insights') {
    event.waitUntil(checkInsights());
  }
  if (event.tag === 'check-stock-alerts') {
    event.waitUntil(checkStockAlerts());
  }
});

async function checkInsights() {
  console.log('[SW] Periodic sync: checking insights');
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.length > 0) {
      clients.forEach((client) => client.postMessage({ type: 'CHECK_INSIGHTS' }));
    }
  } catch (e) {
    console.error('[SW] Periodic sync failed:', e);
  }
}

async function checkStockAlerts() {
  console.log('[SW] Periodic sync: checking stock alerts');
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
    data: { url: data.url || '/' },
    actions: data.actions || [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  if (action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Offline support — serve cached page when offline
// NOTE: Do NOT add a fetch event listener here. Workbox handles caching.
// Adding one here conflicts with the Lovable preview proxy and causes blank pages.

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
