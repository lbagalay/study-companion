/* Study Companion push service worker. It avoids asset caching so updates never get stuck. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || 'Study Companion';
  event.waitUntil(self.registration.showNotification(title, {
    badge: '/icons/icon-192.png',
    body: payload.body || 'You have something coming up.',
    data: { url: payload.url || '/' },
    icon: '/icons/icon-192.png',
    renotify: false,
    tag: payload.tag || 'study-companion-reminder',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
