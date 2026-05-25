/* MoneyMap — Web Push Service Worker */
self.addEventListener('push', (event) => {
  const defaults = { title: 'MoneyMap Alert', body: 'You have a new notification' };

  event.waitUntil(
    (async () => {
      let data = { ...defaults };

      if (event.data) {
        try {
          data = await event.data.json();
        } catch {
          try {
            const text = await event.data.text();
            data = { ...defaults, body: text || defaults.body };
          } catch {
            // keep defaults
          }
        }
      }

      const options = {
        body: data.body || defaults.body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: data.type || 'moneymap-alert',
        data: { url: '/notifications' },
      };

      await self.registration.showNotification(data.title || defaults.title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
