/* ═══════════════════════════════════════════════════════════════════
   Service worker Rehab4Perf — app athlète (PWA).
   Stratégie :
   - Navigations (ouverture de l'app)  → réseau d'abord, repli cache hors-ligne.
   - Assets statiques (polices, icônes) → cache d'abord + mise à jour en fond.
   - Appels API Supabase / cross-origin  → jamais interceptés (données fraîches).
   Le cache est versionné : bump CACHE à chaque changement de logique de cache.
   ═══════════════════════════════════════════════════════════════════ */
var CACHE = 'r4p-athlete-v1';
var PRECACHE = [
  '/athlete.html',
  '/fonts/fonts.css',
  '/favicon.svg',
  '/icons/athlete-192.png',
  '/icons/athlete-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Cross-origin (Supabase REST/Storage, etc.) : laisser passer sans intercepter.
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord (déploiements pris en compte), repli sur le shell caché.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('/athlete.html', copy); });
        return res;
      }).catch(function () { return caches.match('/athlete.html'); })
    );
    return;
  }

  // Assets statiques : cache d'abord, revalidation en arrière-plan.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
