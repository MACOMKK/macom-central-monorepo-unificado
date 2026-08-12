// Service Worker de Web Push, generico pra qualquer app do monorepo -- e o codigo que roda com
// o app fechado/em background, mostra a notificacao do SO e trata o clique nela. Cada app copia
// este arquivo pra `public/push-sw.js` (registrado por @macom/push em subscribeToPush) e recebe
// o mesmo comportamento; se o formato do payload mudar, atualizar aqui e recopiar nos apps.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Notificacao', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'MACOM';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
