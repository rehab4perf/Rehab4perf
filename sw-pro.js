/* ═══════════════════════════════════════════════════════════════════
   Service worker Rehab4Perf PRO — app praticien (PWA installable).
   Distinct du sw.js (app athlète, scope /athlete.html).
   Stratégie (identique à l'athlète, éprouvée) :
   - Navigations (shell + iframes bilan/outils/programme/account) →
     réseau d'abord, repli cache hors-ligne. L'app est donc TOUJOURS
     fraîche en ligne (les déploiements sont pris en compte immédiatement).
   - Assets statiques (polices, icônes, JS versionnés ?v=) → cache d'abord
     + revalidation en fond. Le cache-busting ?v= garantit qu'une nouvelle
     version de JS a une URL différente → jamais servie périmée.
   - Supabase / CDN / cross-origin → jamais interceptés (données fraîches).
   - /athlete.html → ignoré (géré par sw.js, scope plus spécifique).
   Bump CACHE à chaque changement de logique de cache.
   ═══════════════════════════════════════════════════════════════════ */
var CACHE = 'r4p-pro-v1';
var PRECACHE = [
  '/',
  '/index.html',
  '/bilan.html',
  '/outils.html',
  '/programme.html',
  '/account.html',
  '/auth.html',
  '/fonts/fonts.css',
  '/favicon.svg',
  '/icons/pro-192.png',
  '/icons/pro-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // addAll échoue en bloc si un asset manque : on tolère les absences.
      .then(function (c) { return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); })); })
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

  // Cross-origin (Supabase REST/Storage, CDN jsdelivr, etc.) : ne pas intercepter.
  if (url.origin !== self.location.origin) return;

  // L'app athlète est gérée par son propre SW (sw.js) : ne pas s'en mêler.
  if (url.pathname.indexOf('/athlete.html') === 0) return;

  // Navigation (shell + iframes) : réseau d'abord, repli cache puis shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('/index.html'); });
      })
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
