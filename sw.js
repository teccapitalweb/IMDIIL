/* ============================================================
   IMDIIL · Service Worker
   Estrategia: network-first con respaldo de caché.
   - Siempre intenta traer la versión más reciente desde la red.
   - Si no hay conexión, sirve lo último que se guardó en caché.
   - NUNCA intercepta otros orígenes (Firebase, Stripe, fuentes, CDNs):
     esas peticiones van directo a la red para no romper pagos ni datos.
   Sube este archivo a la raíz del repositorio, junto a index.html.
   ============================================================ */

var CACHE = 'imdiil-vip-v30';

// Al instalar, activarse de inmediato (sin esperar a que se cierren pestañas viejas)
self.addEventListener('install', function (e) {
  self.skipWaiting();
});

// Al activar, tomar control de las pestañas y limpiar cachés viejas
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { if (k !== CACHE) return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // Solo manejamos GET
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Solo cacheamos recursos del mismo origen (la propia app).
  // Firebase, Stripe, Google Fonts, etc. quedan intactos y van siempre a la red.
  if (url.origin !== self.location.origin) return;

  // network-first: intenta la red; si falla, usa la caché
  e.respondWith(
    fetch(req).then(function (res) {
      try {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      } catch (err) { /* ignorar errores de caché */ }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        // La app instalada siempre vuelve al acceso; desde ahí Firebase decide
        // si muestra el login o devuelve al usuario a su panel activo.
        return cached || caches.match('vip-auth.html') || caches.match('./vip-auth.html');
      });
    })
  );
});

// ─── Notificaciones push (las envía el webhook con llaves VAPID) ───
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (err) { data = { body: event.data ? event.data.text() : '' }; }
  var title = String(data.title || 'IMDIIL');
  var url = String(data.url || '/vip-panel.html#inicio');
  var actionLabel = String(data.action || 'Abrir IMDIIL');
  event.waitUntil(self.registration.showNotification(title, {
    body: String(data.body || ''),
    icon: String(data.icon || '/assets/imdiil-app-icon-192.png'),
    badge: String(data.badge || '/assets/imdiil-app-icon-192.png'),
    tag: String(data.tag || 'imdiil'),
    renotify: false,
    data: { url: url, templateId: String(data.templateId || '') },
    actions: [{ action: 'open', title: actionLabel }]
  }));
});

// Al tocar la notificación: enfoca el panel abierto o abre uno nuevo (solo mismo origen).
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var raw = event.notification && event.notification.data && event.notification.data.url || '/vip-panel.html#inicio';
  var target;
  try { target = new URL(raw, self.location.origin); } catch (err) { target = new URL('/vip-panel.html#inicio', self.location.origin); }
  if (target.origin !== self.location.origin) target = new URL('/vip-panel.html#inicio', self.location.origin);
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i += 1) {
      if (new URL(windows[i].url).origin === self.location.origin) {
        return windows[i].focus().then(function (client) {
          if (client.navigate) return client.navigate(target.href);
          return client;
        });
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
