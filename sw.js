/* Halal Haram Detector – Service Worker (offline spielbar, Stale-While-Revalidate) */
const CACHE = 'hhd-v1';
const ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/util.js', './js/data.js', './js/store.js', './js/audio.js', './js/art.js', './js/world.js',
  './js/fx.js', './js/game.js', './js/duel.js', './js/ui.js', './js/main.js',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/fonts/lilita-one-latin.woff2', './assets/fonts/nunito-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
