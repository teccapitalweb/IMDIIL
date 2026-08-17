/* ============================================================
   IMDIIL · Service Worker
   Estrategia: network-first con respaldo de caché.
   - Siempre intenta traer la versión más reciente desde la red.
   - Si no hay conexión, sirve lo último que se guardó en caché.
   - NUNCA intercepta otros orígenes (Firebase, Stripe, fuentes, CDNs):
     esas peticiones van directo a la red para no romper pagos ni datos.
   Sube este archivo a la raíz del repositorio, junto a index.html.
   ============================================================ */

var CACHE = 'imdiil-vip-v7';

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
        // Si es una navegación y no hay nada cacheado, intenta servir el index
        return cached || caches.match('index.html') || caches.match('./');
      });
    })
  );
});
